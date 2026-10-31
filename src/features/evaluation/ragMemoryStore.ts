/**
 * PARKLAB 3D — Persistent RAG Vector/Feature & Episodic Memory Store
 *
 * Implements:
 * - Browser localStorage persistence under `parklab3d:rag-memory:v1` with
 *   safe fallback in memory when storage is unavailable or restricted.
 * - Real TF-IDF Cosine Similarity + Structured Telemetry Feature Similarity
 *   retrieval across both static parking guidance (`STATIC_CRASH_KNOWLEDGE_BASE`)
 *   and dynamic player crash/attempt history (`CrashMemoryRecord[]`, `AttemptMemoryRecord[]`).
 * - Question-answering retrieval (`retrieveRAGContextForQuestion`) for the
 *   interactive Voice / Text "Ask Coach" feature.
 *
 * PRIVACY GUARANTEE:
 * Only structured vehicle telemetry and parking attempt metrics are stored.
 * Webcam frames, images, or facial cue signals are NEVER persisted here.
 */

import type {
  ChallengeId,
  ParkingChallengeDefinition,
  VehicleDefinition,
} from '../challenges/types';
import { STATIC_CRASH_KNOWLEDGE_BASE } from './crashKnowledgeBase';
import type {
  AttemptMemoryRecord,
  CrashMemoryRecord,
  CrashTelemetryEvent,
  RAGMemoryStorePayload,
  RAGRetrievalResult,
  RetrievedRAGContextItem,
  StaticGuidanceDocument,
} from './crashRagTypes';

export const RAG_MEMORY_STORAGE_KEY = 'parklab3d:rag-memory:v1';
const MAX_STORED_CRASHES = 100;
const MAX_STORED_ATTEMPTS = 150;

let inMemoryFallbackStore: RAGMemoryStorePayload = {
  version: 1,
  updatedAtIso: new Date(0).toISOString(),
  crashes: [],
  attempts: [],
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'into',
  'from',
  'that',
  'this',
  'your',
  'you',
  'was',
  'were',
  'are',
  'while',
  'when',
  'before',
  'after',
  'too',
  'how',
  'what',
  'why',
  'did',
  'can',
]);

/**
 * Tokenizes a text string into normalized terms for TF-IDF vectorization.
 */
export function tokenizeForRAG(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/**
 * Computes true TF-IDF cosine similarity between `queryText` and each document
 * in `corpusTexts`.
 */
export function computeTfIdfCosineScores(
  queryText: string,
  corpusTexts: string[]
): number[] {
  const queryTokens = tokenizeForRAG(queryText);
  if (queryTokens.length === 0 || corpusTexts.length === 0) {
    return corpusTexts.map(() => 0);
  }

  const docTokenLists = corpusTexts.map((text) => tokenizeForRAG(text));
  const totalDocs = docTokenLists.length + 1;

  // Build document frequency (DF) across corpus + query
  const docFreq = new Map<string, number>();
  const allTokenSets = [
    new Set(queryTokens),
    ...docTokenLists.map((tokens) => new Set(tokens)),
  ];
  for (const tokenSet of allTokenSets) {
    for (const term of tokenSet) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const getIdf = (term: string): number => {
    const df = docFreq.get(term) ?? 0;
    return Math.log(1 + totalDocs / (1 + df));
  };

  const buildTfIdfVector = (tokens: string[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const vec = new Map<string, number>();
    const len = Math.max(1, tokens.length);
    for (const [term, count] of counts.entries()) {
      const tf = count / len;
      vec.set(term, tf * getIdf(term));
    }
    return vec;
  };

  const vectorNorm = (vec: Map<string, number>): number => {
    let sumSq = 0;
    for (const weight of vec.values()) {
      sumSq += weight * weight;
    }
    return Math.sqrt(sumSq);
  };

  const queryVec = buildTfIdfVector(queryTokens);
  const queryNorm = vectorNorm(queryVec);
  if (queryNorm === 0) {
    return corpusTexts.map(() => 0);
  }

  return docTokenLists.map((docTokens) => {
    if (docTokens.length === 0) {
      return 0;
    }
    const docVec = buildTfIdfVector(docTokens);
    const docNorm = vectorNorm(docVec);
    if (docNorm === 0) {
      return 0;
    }
    let dot = 0;
    for (const [term, qWeight] of queryVec.entries()) {
      const dWeight = docVec.get(term);
      if (dWeight !== undefined) {
        dot += qWeight * dWeight;
      }
    }
    return Math.min(1, Math.max(0, dot / (queryNorm * docNorm)));
  });
}

function isValidMemoryPayload(value: unknown): value is RAGMemoryStorePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<RAGMemoryStorePayload>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.crashes) &&
    Array.isArray(candidate.attempts)
  );
}

/**
 * Loads the persistent RAG memory store from localStorage with safe fallback.
 */
export function loadRAGMemoryStore(): RAGMemoryStorePayload {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      ...inMemoryFallbackStore,
      crashes: [...inMemoryFallbackStore.crashes],
      attempts: [...inMemoryFallbackStore.attempts],
    };
  }

  try {
    const raw = window.localStorage.getItem(RAG_MEMORY_STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        updatedAtIso: new Date().toISOString(),
        crashes: [],
        attempts: [],
      };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidMemoryPayload(parsed)) {
      return {
        version: 1,
        updatedAtIso: new Date().toISOString(),
        crashes: [],
        attempts: [],
      };
    }
    inMemoryFallbackStore = parsed;
    return parsed;
  } catch {
    return {
      ...inMemoryFallbackStore,
      crashes: [...inMemoryFallbackStore.crashes],
      attempts: [...inMemoryFallbackStore.attempts],
    };
  }
}

function persistRAGMemoryStore(payload: RAGMemoryStorePayload): void {
  const pruned: RAGMemoryStorePayload = {
    version: 1,
    updatedAtIso: new Date().toISOString(),
    crashes: payload.crashes.slice(-MAX_STORED_CRASHES),
    attempts: payload.attempts.slice(-MAX_STORED_ATTEMPTS),
  };
  inMemoryFallbackStore = pruned;

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      RAG_MEMORY_STORAGE_KEY,
      JSON.stringify(pruned)
    );
  } catch {
    // Graceful fallback to in-memory store if storage quota or privacy mode blocks write
  }
}

/**
 * Saves a newly analyzed crash event into persistent RAG episodic memory.
 */
export function saveCrashMemoryRecord(
  record: CrashMemoryRecord
): RAGMemoryStorePayload {
  const current = loadRAGMemoryStore();
  const exists = current.crashes.some((c) => c.eventId === record.eventId);
  if (exists) {
    return current;
  }
  const updated: RAGMemoryStorePayload = {
    ...current,
    crashes: [...current.crashes, record],
  };
  persistRAGMemoryStore(updated);
  return updated;
}

/**
 * Saves a finalized attempt summary into persistent RAG episodic memory.
 */
export function saveAttemptMemoryRecord(
  attempt: AttemptMemoryRecord
): RAGMemoryStorePayload {
  const current = loadRAGMemoryStore();
  const filtered = current.attempts.filter(
    (a) => a.attemptId !== attempt.attemptId
  );
  const updated: RAGMemoryStorePayload = {
    ...current,
    attempts: [...filtered, attempt],
  };
  persistRAGMemoryStore(updated);
  return updated;
}

/**
 * Clears all stored crash and attempt records from localStorage and memory.
 */
export function clearRAGMemoryStore(): RAGMemoryStorePayload {
  const empty: RAGMemoryStorePayload = {
    version: 1,
    updatedAtIso: new Date().toISOString(),
    crashes: [],
    attempts: [],
  };
  inMemoryFallbackStore = empty;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(RAG_MEMORY_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
  return empty;
}

/**
 * Returns all stored attempts for a specific challenge in chronological order.
 */
export function getChallengeAttemptHistory(
  challengeId: ChallengeId,
  store?: RAGMemoryStorePayload
): AttemptMemoryRecord[] {
  const activeStore = store ?? loadRAGMemoryStore();
  return activeStore.attempts.filter((a) => a.challengeId === challengeId);
}

/**
 * Computes structured feature similarity [0..1] between a crash event and a
 * static guidance document.
 */
function scoreStaticGuidanceFeatures(
  crash: CrashTelemetryEvent,
  doc: StaticGuidanceDocument
): number {
  let score = 0;

  // Challenge match (weight 0.32)
  if (doc.challengeId === crash.challengeId) {
    score += 0.32;
  } else if (doc.challengeId === 'all') {
    score += 0.14;
  }

  // Exact or prefix obstacle ID match (weight 0.28)
  if (
    doc.obstacleIdPattern &&
    crash.obstacle.id.startsWith(doc.obstacleIdPattern)
  ) {
    score += 0.28;
  } else if (doc.obstacleKind === crash.obstacle.kind) {
    score += 0.18;
  } else if (doc.obstacleKind === 'all') {
    score += 0.08;
  }

  // Driving direction match (weight 0.18)
  if (doc.applicableDirections.includes(crash.drivingDirectionBeforeImpact)) {
    score += 0.18;
  }

  // Probable cause match (weight 0.14)
  if (doc.applicableCauseTags?.includes(crash.probableCauseTag)) {
    score += 0.14;
  }

  // Vehicle impact zone match (weight 0.08)
  if (doc.applicableImpactZones?.includes(crash.vehicleImpactZone)) {
    score += 0.08;
  }

  return Math.min(1, score);
}

/**
 * Computes structured feature similarity [0..1] between a new crash event and
 * a historical crash record in episodic memory.
 */
function scorePastCrashFeatures(
  crash: CrashTelemetryEvent,
  past: CrashMemoryRecord
): number {
  let score = 0;

  if (past.challengeId === crash.challengeId) {
    score += 0.35;
  }
  if (past.obstacleId === crash.obstacle.id) {
    score += 0.3;
  } else if (past.obstacleKind === crash.obstacle.kind) {
    score += 0.15;
  }
  if (
    past.drivingDirectionBeforeImpact === crash.drivingDirectionBeforeImpact
  ) {
    score += 0.12;
  }
  if (past.vehicleImpactZone === crash.vehicleImpactZone) {
    score += 0.1;
  }
  if (past.probableCauseTag === crash.probableCauseTag) {
    score += 0.08;
  }

  const speedDiff = Math.abs(past.preImpactSpeedMph - crash.preImpactSpeedMph);
  if (speedDiff <= 2.0) {
    score += 0.05;
  }

  return Math.min(1, score);
}

function roundScore(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Executes the hybrid RAG retrieval pipeline for a newly detected crash event.
 * Ranks both static domain documents and historical player crashes/attempts.
 */
export function retrieveRAGContextForCrash(
  crash: CrashTelemetryEvent,
  store?: RAGMemoryStorePayload
): RAGRetrievalResult {
  const activeStore = store ?? loadRAGMemoryStore();
  const queryText = crash.searchableSummaryText;

  // 1. Score Static Guidance Documents (TF-IDF + Structured Feature Similarity)
  const staticCorpusTexts = STATIC_CRASH_KNOWLEDGE_BASE.map(
    (doc) => `${doc.title} ${doc.searchKeywords} ${doc.guidanceText} ${doc.correctiveAction}`
  );
  const staticTfIdfScores = computeTfIdfCosineScores(
    queryText,
    staticCorpusTexts
  );

  const scoredGuidance = STATIC_CRASH_KNOWLEDGE_BASE.map((doc, idx) => {
    const tfidfScore = staticTfIdfScores[idx] ?? 0;
    const featureScore = scoreStaticGuidanceFeatures(crash, doc);
    const similarityScore = roundScore(tfidfScore * 0.42 + featureScore * 0.58);
    return {
      doc,
      similarityScore,
      tfidfScore: roundScore(tfidfScore),
      featureScore: roundScore(featureScore),
    };
  })
    .filter((item) => item.similarityScore >= 0.22)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 2);

  // 2. Score Historical Crash Records from Persistent Memory
  const candidatePastCrashes = activeStore.crashes.filter(
    (c) => c.eventId !== crash.eventId
  );
  const pastCorpusTexts = candidatePastCrashes.map((c) => c.searchableText);
  const pastTfIdfScores = computeTfIdfCosineScores(queryText, pastCorpusTexts);

  const similarPastCrashes = candidatePastCrashes
    .map((record, idx) => {
      const tfidfScore = pastTfIdfScores[idx] ?? 0;
      const featureScore = scorePastCrashFeatures(crash, record);
      const similarityScore = roundScore(
        tfidfScore * 0.4 + featureScore * 0.6
      );
      return {
        record,
        similarityScore,
        tfidfScore: roundScore(tfidfScore),
        featureScore: roundScore(featureScore),
      };
    })
    .filter((item) => item.similarityScore >= 0.35)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  // 3. Retrieve Recent Attempts on the Active Challenge
  const recentChallengeAttempts = activeStore.attempts
    .filter((a) => a.challengeId === crash.challengeId)
    .slice(-3)
    .reverse();

  // 4. Assemble unified RetrievedRAGContextItem list for UI & Generator
  const retrievedItems: RetrievedRAGContextItem[] = [
    ...scoredGuidance.map(({ doc, similarityScore, tfidfScore, featureScore }) => ({
      id: doc.id,
      sourceType: 'static-guidance' as const,
      title: doc.title,
      similarityScore,
      tfidfScore,
      featureScore,
      summary: doc.correctiveAction,
    })),
    ...similarPastCrashes.map(
      ({ record, similarityScore, tfidfScore, featureScore }) => ({
        id: record.eventId,
        sourceType: 'past-crash' as const,
        title: `Past Crash (Attempt #${record.attemptNumber} · ${record.obstacleReadableLabel})`,
        similarityScore,
        tfidfScore,
        featureScore,
        summary: `Hit ${record.obstacleReadableLabel} (${record.vehicleImpactZone.replace(/-/g, ' ')}) while moving ${record.drivingDirectionBeforeImpact} at ${record.preImpactSpeedMph.toFixed(1)} mph.`,
      })
    ),
    ...recentChallengeAttempts.slice(0, 2).map((att) => ({
      id: att.attemptId,
      sourceType: 'past-attempt' as const,
      title: `Attempt #${att.attemptNumber} Summary (${att.outcome})`,
      similarityScore: 0.75,
      tfidfScore: 0.5,
      featureScore: 0.9,
      summary:
        att.finalScore !== null
          ? `Score ${att.finalScore}/100 · ${att.collisionCount} collision(s) · ${att.positionErrorMeters?.toFixed(2) ?? '0.00'} m bay offset.`
          : `${att.collisionCount} collision(s) (${att.crashedObstacleLabels.join(', ') || 'none'}) · closest bay distance ${att.closestDistanceToBayMeters.toFixed(2)} m.`,
    })),
  ];

  return {
    queryText,
    topGuidance: scoredGuidance,
    similarPastCrashes,
    recentChallengeAttempts,
    retrievedItems,
  };
}

/**
 * Retrieves relevant RAG knowledge and player history for an interactive
 * user question ("Why did I crash?", "How can I improve my reverse parking?", etc.).
 */
export function retrieveRAGContextForQuestion(params: {
  questionText: string;
  challenge: ParkingChallengeDefinition;
  vehicle: VehicleDefinition;
  latestCrash: CrashTelemetryEvent | null;
  store?: RAGMemoryStorePayload;
}): {
  retrievedItems: RetrievedRAGContextItem[];
  topGuidance: StaticGuidanceDocument[];
  matchingCrashes: CrashMemoryRecord[];
  recentAttempts: AttemptMemoryRecord[];
} {
  const { questionText, challenge, vehicle, latestCrash, store } = params;
  const activeStore = store ?? loadRAGMemoryStore();

  const enrichedQuery = [
    questionText,
    challenge.id,
    challenge.title,
    vehicle.id,
    latestCrash ? latestCrash.obstacle.id : '',
    latestCrash ? latestCrash.probableCauseTag : '',
  ]
    .filter(Boolean)
    .join(' ');

  const staticCorpus = STATIC_CRASH_KNOWLEDGE_BASE.map(
    (doc) => `${doc.title} ${doc.searchKeywords} ${doc.guidanceText} ${doc.correctiveAction}`
  );
  const staticScores = computeTfIdfCosineScores(enrichedQuery, staticCorpus);

  const rankedGuidance = STATIC_CRASH_KNOWLEDGE_BASE.map((doc, idx) => {
    const challengeBonus =
      doc.challengeId === challenge.id
        ? 0.35
        : doc.challengeId === 'all'
          ? 0.12
          : 0;
    const crashBonus =
      latestCrash &&
      doc.obstacleIdPattern &&
      latestCrash.obstacle.id.startsWith(doc.obstacleIdPattern)
        ? 0.25
        : 0;
    const totalScore = roundScore(
      (staticScores[idx] ?? 0) * 0.55 + challengeBonus + crashBonus
    );
    return { doc, score: totalScore, tfidf: roundScore(staticScores[idx] ?? 0) };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const challengeCrashes = activeStore.crashes
    .filter((c) => c.challengeId === challenge.id)
    .slice(-3)
    .reverse();

  const recentAttempts = activeStore.attempts
    .filter((a) => a.challengeId === challenge.id)
    .slice(-3)
    .reverse();

  const retrievedItems: RetrievedRAGContextItem[] = [
    ...rankedGuidance.map((g) => ({
      id: g.doc.id,
      sourceType: 'static-guidance' as const,
      title: g.doc.title,
      similarityScore: g.score,
      tfidfScore: g.tfidf,
      featureScore: roundScore(Math.max(0, g.score - g.tfidf * 0.55)),
      summary: g.doc.correctiveAction,
    })),
    ...challengeCrashes.slice(0, 2).map((c) => ({
      id: c.eventId,
      sourceType: 'past-crash' as const,
      title: `Attempt #${c.attemptNumber} Crash (${c.obstacleReadableLabel})`,
      similarityScore: 0.82,
      tfidfScore: 0.6,
      featureScore: 0.9,
      summary: `Hit ${c.obstacleReadableLabel} at ${c.preImpactSpeedMph.toFixed(1)} mph (${c.drivingDirectionBeforeImpact}).`,
    })),
  ];

  return {
    retrievedItems,
    topGuidance: rankedGuidance.map((g) => g.doc),
    matchingCrashes: challengeCrashes,
    recentAttempts,
  };
}

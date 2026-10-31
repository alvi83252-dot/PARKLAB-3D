# PARKLAB 3D — Anjila's Live Demo Script
## Parking Challenges, Deterministic Assessment, AI Crash RAG Coach & Gameplay UI

---

## Part 1: The 5 UK Driving Test Challenges & 3D Scene (`0:00 – 0:30`)

### What to Do on Screen:
1. Start on the **Challenge Selection** screen (`/challenges`) showing all 5 UK DVSA parking manoeuvre cards with their difficulty badges (`Beginner`, `Intermediate`, `Advanced`), bay dimensions, and obstacle counts.
2. Click **Parallel Parking** (or **Reverse Bay Parking**)—which immediately redirects to `/simulation` and starts that challenge's custom procedural soundtrack.

### What to Say:
> "Hi, I'm Anjila, and I built the **Parking Challenges, Deterministic Assessment Engine, AI Crash Feedback Loop, and Gameplay Interface** for PARKLAB 3D.
>
> In our Challenge Catalogue, I implemented all five UK driving test manoeuvres: **Parallel Parking, Reverse Bay Parking, Forward Bay Parking, 45° Angled Bay Parking, and Pull Up on the Right & Reverse**.
>
> Clicking any challenge card launches straight into the 3D simulation. Each challenge has its own procedural Web Audio soundtrack, spawn position, step-by-step instructions, and my **`ChallengeScene`** component, which renders the illuminated target bay markings, directional heading arrows, kerbs, cones, and parked obstacle cars using the exact same coordinate definitions as the collision system."

---

## Part 2: Gameplay HUD, Intentional Crash & RAG Voice Coach (`0:30 – 1:10`)

### What to Do on Screen:
1. Point out the **`ChallengeHUD`** (live MPH speedometer, `0/4` to `4/4 CORNERS IN BAY` progress bar, and collapsible instructions).
2. Drive manually with `W / A / S / D` and **intentionally clip a parked car or cone**.
3. Let the background music duck while the **AI Voice Coach** speaks the short fix aloud, and point to the compact **`CRASH`** card (`Speed / Gear`, `Impact`, `Steer`, `Cause`, `Fix`, and `RAG Context`).

### What to Say:
> "While driving, my **`ChallengeHUD`** tracks live speed in MPH, distance to the bay centre, alignment angle, and how many of the car's four corners are inside the bay.
>
> I also built a **Continuous AI Crash Feedback Loop powered by a RAG pipeline**. When I intentionally clip this parked car:
> *(Pause 2 seconds while the AI Voice Coach speaks)*
>
> Notice the background music automatically ducks while the **Web Speech Voice Coach** speaks the correction aloud, then restores volume as soon as she finishes. Behind the scenes, my **Crash Kinematics Analyzer** inspects a 60-frame rolling telemetry buffer prior to impact to recover my true pre-impact speed, steering lock, and which corner of my car hit the obstacle. It then runs a hybrid **TF-IDF and feature-similarity RAG search** across our manoeuvre knowledge base and persistent `localStorage` memory to surface a concise **Cause** and **Fix**."

---

## Part 3: Webcam Cues, Retry Loop, Deterministic Scoring & Replay (`1:10 – 1:50`)

### What to Do on Screen:
1. Briefly open **Craft Lab & AI Coach** in the top bar to show **Enable Camera** (live on-device facial cue preview) and **Ask Coach** (*"Why did I crash?"*).
2. Click **Retry** on the crash card (updating the HUD to **Attempt #2**).
3. Park inside the green target bay (`4/4 CORNERS IN BAY · READY TO ASSESS`) and press **`E`** (or click **Park & Evaluate**).
4. On the **`ResultsPanel`**, point out the **PASS** badge, deterministic `0–100` score, `0–3` stars, and the **Attempt #2 vs. Attempt #1 Comparison**.
5. Click **Watch Replay** to launch the **3D Action Video Replay** of the attempt.

### What to Say:
> "We also support a strictly opt-in, on-device **Webcam Facial Cue Observer** and a push-to-talk **Ask Coach** feature so drivers can ask questions like *'Why did I crash?'* and get answers grounded in their recorded RAG history.
>
> When I click **Retry** and park cleanly inside the bay on Attempt #2, my deterministic **`evaluateParking`** engine transforms all four rotated corners of the vehicle into the target bay's local coordinate frame—verifying full 4-corner footprint containment, heading alignment in degrees, roadside kerb gap in metres, standstill status, and collisions.
>
> On the **`ResultsPanel`**, alongside the deterministic score out of 100 and star rating, the RAG loop compares Attempt #2 against Attempt #1 to highlight measurable improvement. From here, players can click **Watch Replay** to watch a full **3D Action Replay** of their manoeuvre with timeline scrubbing and camera switching—and on mobile devices, the HUD automatically minimizes to fit an iPhone screen with a **Left-Thumb Brake** and **Right-Thumb 360° Virtual Thumbstick**."

---

## Quick Demo Checklist Before Presenting

1. **Clear Old History (Optional):** Click **Craft Lab & AI Coach → Reset AI Memory** before starting so your demo begins cleanly at **Attempt #1** (`0 crashes · 0 attempts`).
2. **Audio Check:** Make sure system audio is unmuted so the audience hears both the challenge synthwave soundtrack and the automatic ducking when the AI Voice Coach speaks.
3. **Shortcut Keys During Demo:**
   - `W / A / S / D` or Arrow Keys — Drive & Steer
   - `Space` / `B` — Brake / Handbrake
   - `C` — Toggle Follow / Overhead Camera
   - `E` or `Enter` — Park & Evaluate
   - `H` — Toggle HUD Open / Closed

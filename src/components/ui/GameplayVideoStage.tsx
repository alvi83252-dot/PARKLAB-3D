import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Film,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Upload,
} from 'lucide-react';

export type SimulationPresetType =
  | 'hero'
  | 'parallel'
  | 'reverse-bay'
  | 'forward-bay'
  | 'pull-up-right'
  | 'telemetry-eval';

export interface GameplayVideoStageProps {
  /** Primary MP4 path (e.g., '/assets/videos/parallel-park.mp4') */
  videoSrc: string;
  /** Optional WebM path for higher compression */
  webmSrc?: string;
  /** Optional poster image */
  posterSrc?: string;
  /** Accent hex color for telemetry HUD & fallback simulation */
  accentColor?: string;
  /** Preset trajectory rendered when video asset is not yet placed in public/assets/videos */
  preset: SimulationPresetType;
  /** Whether this video stage is currently active/in-view */
  isActive?: boolean;
  /** Camera rig label shown in the corner HUD */
  cameraLabel?: string;
  /** Code identifier shown in the corner HUD */
  reelCode?: string;
  /** Whether to show interactive playback & preview controls */
  showControls?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Renders a looping, muted high-frame-rate gameplay video with Ananta-style
 * HUD framing. Automatically falls back to a 60fps procedural parking telemetry
 * canvas when the target `.mp4`/`.webm` file is not yet present in `public/assets/videos/`,
 * and supports drag-and-drop local video previewing.
 */
export function GameplayVideoStage({
  videoSrc,
  webmSrc,
  posterSrc,
  accentColor = '#3b82f6',
  preset,
  isActive = true,
  cameraLabel = 'CAM_01 // ORBIT_TELEMETRY',
  reelCode = 'REEL // 60FPS_CAPTURE',
  showControls = true,
  className = '',
}: GameplayVideoStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasVideoLoaded, setHasVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [customBlobUrl, setCustomBlobUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Clean up object URL on unmount or replacement
  useEffect(() => {
    return () => {
      if (customBlobUrl) {
        URL.revokeObjectURL(customBlobUrl);
      }
    };
  }, [customBlobUrl]);

  // Reset state if videoSrc prop changes and no custom blob is loaded
  useEffect(() => {
    if (!customBlobUrl) {
      setHasVideoLoaded(false);
      setVideoFailed(false);
    }
  }, [videoSrc, customBlobUrl]);

  // Play/pause based on active visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || (!hasVideoLoaded && !customBlobUrl)) return;

    if (isActive && isPlaying) {
      video.play().catch(() => {
        // Autoplay fallback if browser blocks initial play
      });
    } else {
      video.pause();
    }
  }, [isActive, isPlaying, hasVideoLoaded, customBlobUrl]);

  const handleVideoLoadedData = useCallback(() => {
    setHasVideoLoaded(true);
    setVideoFailed(false);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!customBlobUrl) {
      setVideoFailed(true);
      setHasVideoLoaded(false);
    }
  }, [customBlobUrl]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const loadLocalFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return;
    const nextUrl = URL.createObjectURL(file);
    setCustomBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    setCustomFileName(file.name);
    setVideoFailed(false);
    setHasVideoLoaded(true);
    setIsPlaying(true);
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        loadLocalFile(file);
      }
    },
    [loadLocalFile]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        loadLocalFile(file);
      }
    },
    [loadLocalFile]
  );

  const handleResetCustomFile = useCallback(() => {
    setCustomBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCustomFileName(null);
    setHasVideoLoaded(false);
    setVideoFailed(true);
  }, []);

  // Procedural 60fps Telemetry Simulation Canvas when video file isn't present yet
  const showFallbackCanvas = !hasVideoLoaded || videoFailed;

  useEffect(() => {
    if (!showFallbackCanvas || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let startTime = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawCarChassis = (
      x: number,
      y: number,
      angleRad: number,
      steerRad: number,
      color: string
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angleRad);

      const carLength = 68;
      const carWidth = 32;

      // Ultrasonic proximity pulse
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 48, Math.PI - 0.6, Math.PI + 0.6);
      ctx.stroke();

      // Wheels / Vectored Hover-Turbine Pods (4 corners, front pods rotate by steerRad)
      const wheelPositions = [
        { wx: 21, wy: -16, isFront: true },
        { wx: 21, wy: 16, isFront: true },
        { wx: -21, wy: -16, isFront: false },
        { wx: -21, wy: 16, isFront: false },
      ];

      const isRoadsterPreset =
        preset === 'hero' ||
        preset === 'reverse-bay' ||
        preset === 'telemetry-eval';

      if (isRoadsterPreset) {
        // Anti-gravity ground ion ring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 38, 22, 0, 0, Math.PI * 2);
        ctx.stroke();

        // SpaceX cold-gas rear thruster plasma plume
        const plumeGrad = ctx.createLinearGradient(-34, 0, -68, 0);
        plumeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        plumeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.moveTo(-34, -7);
        ctx.lineTo(-66, -15);
        ctx.lineTo(-66, 15);
        ctx.lineTo(-34, 7);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = isRoadsterPreset ? '#38bdf8' : '#cbd5e1';
      wheelPositions.forEach(({ wx, wy, isFront }) => {
        ctx.save();
        ctx.translate(wx, wy);
        if (isFront) ctx.rotate(steerRad);
        if (isRoadsterPreset) {
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-7, -2.5, 14, 5);
        }
        ctx.restore();
      });

      // Chassis body
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-carLength / 2, -carWidth / 2, carLength, carWidth, 7);
      ctx.fill();
      ctx.stroke();

      // Windshield & glass roof
      ctx.fillStyle = `${color}28`;
      ctx.beginPath();
      ctx.roundRect(-14, -carWidth / 2 + 4, 28, carWidth - 8, 4);
      ctx.fill();

      // Headlight beams
      const grad = ctx.createLinearGradient(
        carLength / 2,
        0,
        carLength / 2 + 55,
        0
      );
      grad.addColorStop(0, `${color}55`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(carLength / 2, -12);
      ctx.lineTo(carLength / 2 + 55, -26);
      ctx.lineTo(carLength / 2 + 55, 26);
      ctx.lineTo(carLength / 2, 12);
      ctx.closePath();
      ctx.fill();

      // Centre axle crosshair
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();

      ctx.restore();
    };

    const renderFrame = (now: number) => {
      if ( isPlaying ) {
        // advance clock normally
      } else {
        startTime += 16.67;
      }

      const elapsed = (now - startTime) * 0.001;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      // Deep automotive asphalt background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#131923');
      bgGrad.addColorStop(1, '#090b0f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective / Orthographic Telemetry Grid
      const gridSize = 44;
      const scrollY = Number.parseFloat(
        document.documentElement.style.getPropertyValue('--lenis-scroll') || '0'
      );
      const gridOffsetY = (scrollY * 0.15) % gridSize;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -gridSize + gridOffsetY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const cx = width * 0.5;
      const cy = height * 0.52;

      // Normalized cycle [0..1] every 7 seconds
      const cycle = (elapsed % 7) / 7;
      // Smooth ease-in-out progress with pause at end of manoeuvre
      const rawT = Math.min(cycle / 0.78, 1);
      const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      // Draw target parking bay & animated trajectory based on preset
      if (preset === 'parallel' || preset === 'hero') {
        // Kerb line along bottom-center
        const bayX = cx + 20;
        const bayY = cy + 52;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 260, bayY + 28);
        ctx.lineTo(cx + 260, bayY + 28);
        ctx.stroke();

        // Target Parallel Bay Box
        ctx.strokeStyle = rawT >= 0.98 ? '#10b981' : accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bayX - 48, bayY - 22, 96, 44);
        ctx.setLineDash([]);

        // Parked reference car ahead
        drawCarChassis(bayX - 125, bayY, 0, 0, '#475569');

        // Ideal S-curve spline
        ctx.strokeStyle = `${accentColor}66`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bayX - 120, bayY - 58);
        ctx.bezierCurveTo(
          bayX - 40,
          bayY - 58,
          bayX - 40,
          bayY,
          bayX,
          bayY
        );
        ctx.stroke();

        // Interpolate vehicle along S-curve reverse entry
        const carX = (1 - t) * (bayX - 115) + t * bayX;
        const sCurve = Math.sin(t * Math.PI);
        const carY = (1 - t) * (bayY - 58) + t * bayY;
        const yaw = sCurve * 0.42 * (1 - t * 0.5);
        const steer = t < 0.5 ? -0.45 : t < 0.95 ? 0.45 : 0;

        drawCarChassis(carX, carY, yaw, steer, accentColor);
      } else if (preset === 'reverse-bay') {
        const bayX = cx + 50;
        const bayY = cy + 45;

        // Bay lines (vertical 90-deg bay)
        ctx.strokeStyle = rawT >= 0.98 ? '#10b981' : accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bayX - 24, bayY - 46, 48, 92);
        ctx.setLineDash([]);

        // Adjacent bays
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.strokeRect(bayX - 72, bayY - 46, 48, 92);
        ctx.strokeRect(bayX + 24, bayY - 46, 48, 92);

        // 90-degree reverse arc
        const startX = cx - 95;
        const startY = cy - 45;
        const carX = startX + (bayX - startX) * Math.sin((t * Math.PI) / 2);
        const carY = startY + (bayY - startY) * (1 - Math.cos((t * Math.PI) / 2));
        const yaw = (1 - t) * 0 + t * (-Math.PI / 2);
        const steer = t < 0.9 ? 0.52 : 0;

        drawCarChassis(carX, carY, yaw, steer, accentColor);
      } else if (preset === 'forward-bay') {
        const bayX = cx + 45;
        const bayY = cy - 42;

        ctx.strokeStyle = rawT >= 0.98 ? '#10b981' : accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bayX - 24, bayY - 46, 48, 92);
        ctx.setLineDash([]);

        const startX = cx - 110;
        const startY = cy + 52;
        const carX = startX + (bayX - startX) * Math.sin((t * Math.PI) / 2);
        const carY = startY + (bayY - startY) * (1 - Math.cos((t * Math.PI) / 2));
        const yaw = (1 - t) * 0 + t * (-Math.PI / 2);
        const steer = t < 0.9 ? -0.48 : 0;

        drawCarChassis(carX, carY, yaw, steer, accentColor);
      } else if (preset === 'pull-up-right') {
        const corridorY = cy - 42;

        // Right-hand kerb line
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 240, corridorY - 28);
        ctx.lineTo(cx + 240, corridorY - 28);
        ctx.stroke();

        // 2-car-length reverse zone
        ctx.strokeStyle = accentColor;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(cx - 120, corridorY - 22, 240, 44);
        ctx.setLineDash([]);

        const carX = cx + 70 - t * 140;
        drawCarChassis(carX, corridorY, 0, 0, accentColor);
      } else {
        // telemetry-eval: 45-degree angle bay + live radar rings
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = rawT >= 0.98 ? '#10b981' : accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-48, -24, 96, 48);
        ctx.setLineDash([]);
        ctx.restore();

        const carX = cx - (1 - t) * 95;
        const carY = cy + (1 - t) * 75;
        const yaw = -(t * Math.PI) / 4;
        drawCarChassis(carX, carY, yaw, (1 - t) * -0.35, accentColor);
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [showFallbackCanvas, isActive, preset, accentColor, isPlaying]);

  return (
    <div
      className={`gameplay-stage ${isDraggingOver ? 'gameplay-stage--dragover' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Native HTML5 Gameplay Video Loop */}
      <video
        ref={videoRef}
        className={`gameplay-stage__video ${
          hasVideoLoaded && !videoFailed ? 'gameplay-stage__video--visible' : ''
        }`}
        poster={posterSrc}
        muted
        loop
        playsInline
        autoPlay
        onLoadedData={handleVideoLoadedData}
        onError={handleVideoError}
        key={customBlobUrl ?? videoSrc}
      >
        {customBlobUrl ? (
          <source src={customBlobUrl} />
        ) : (
          <>
            {webmSrc && <source src={webmSrc} type="video/webm" />}
            <source src={videoSrc} type="video/mp4" />
          </>
        )}
      </video>

      {/* Procedural 60FPS Telemetry Simulation Fallback when video file is not yet placed on disk */}
      {showFallbackCanvas && (
        <canvas
          ref={canvasRef}
          className="gameplay-stage__canvas"
          aria-label="Live procedural parking telemetry preview"
        />
      )}

      {/* Subtle scanline & vignette overlay (Ananta / Tactical HUD aesthetic) */}
      <div className="gameplay-stage__overlay" aria-hidden="true" />

      {/* Top HUD Telemetry Bar inside Video Frame */}
      <div className="gameplay-stage__hud-top">
        <div className="gameplay-stage__badge">
          <Radio
            size={12}
            className="gameplay-stage__live-dot"
            style={{ color: accentColor }}
          />
          <span>{cameraLabel}</span>
        </div>

        <div className="gameplay-stage__source-pill">
          <Film size={12} />
          <span>
            {customFileName
              ? `LOCAL PREVIEW: ${customFileName}`
              : hasVideoLoaded && !videoFailed
                ? reelCode
                : `SIMULATED FEED · DROP ${videoSrc.split('/').pop()} TO REPLACE`}
          </span>
        </div>
      </div>

      {/* Bottom Interactive Video / Preview Controls */}
      {showControls && (
        <div className="gameplay-stage__hud-bottom">
          <div className="gameplay-stage__controls">
            <button
              type="button"
              className="gameplay-stage__ctrl-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause footage' : 'Play footage'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              type="button"
              className="gameplay-stage__ctrl-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Preview a local .mp4 or .webm gameplay capture in this slot"
            >
              <Upload size={13} />
              <span>TEST LOCAL .MP4</span>
            </button>

            {customBlobUrl && (
              <button
                type="button"
                className="gameplay-stage__ctrl-btn"
                onClick={handleResetCustomFile}
                title="Reset to default asset slot"
              >
                <RotateCcw size={13} />
                <span>RESET</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="sr-only-input"
              onChange={handleFileChange}
            />
          </div>

          <div className="gameplay-stage__corner-coords" aria-hidden="true">
            <span>FPS: 60.0</span>
            <span>LENIS: SYNCED</span>
          </div>
        </div>
      )}
    </div>
  );
}

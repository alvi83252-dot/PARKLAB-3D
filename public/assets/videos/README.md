# Gameplay Footage Assets (`public/assets/videos/`)

Place your recorded **PARKLAB 3D** gameplay footage in this directory. The Lenis-powered landing page (`HomeScreen`) automatically loads these files and crossfades between them as the user scrolls through sections.

If a video file is not yet present on disk, the `<GameplayVideoStage />` component automatically renders a real-time procedural telemetry canvas fallback and allows you to **drag-and-drop any `.mp4` or `.webm` file directly in the browser** to preview it immediately.

## Expected File Names

| Slot ID | File Path (`public/assets/videos/...`) | Recommended Resolution & Codec | Description |
|---|---|---|---|
| `hero-showcase` | `hero-loop.mp4` (optional `hero-loop.webm`) | 1920×1080 · 60fps · H.264 / VP9 (Muted) | Full-bleed hero background montage of 3D car park & vehicle movement |
| `parallel-park` | `parallel-park.mp4` | 1920×1080 · 60fps · H.264 | Parallel parking reverse-in trajectory & kerb alignment |
| `reverse-bay-park` | `reverse-bay.mp4` | 1920×1080 · 60fps · H.264 | 90-degree reverse bay parking manoeuvre |
| `forward-bay-park` | `forward-bay.mp4` | 1920×1080 · 60fps · H.264 | Forward bay approach & steering swing |
| `pull-up-on-right-reverse` | `pull-up-right.mp4` | 1920×1080 · 60fps · H.264 | Pull up on the right and reverse 2 car lengths |
| `telemetry-scoring` | `telemetry-scoring.mp4` | 1920×1080 · 60fps · H.264 | Tesla Roadster & UK Hatchback spatial scoring overlay |

## Encoding Tips for Smooth Lenis Scroll Performance

```bash
# Recommended FFmpeg command for crisp, lightweight web loops (no audio track):
ffmpeg -i raw-capture.mp4 -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -an public/assets/videos/hero-loop.mp4
```

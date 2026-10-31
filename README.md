# PARKLAB 3D

**PARKLAB 3D** is an interactive, browser-based 3D parking simulator designed to help drivers practise and master UK driving test parking manoeuvres.

> **Current Status:** Stage 1 — Project Scaffolding & Vercel Deployment Foundation.
> Core domain types, directory architecture, routing foundations, design tokens, and production build/deployment pipelines are established. 3D gameplay, physics, and scoring will be introduced in subsequent stages.

---

## Project Overview

When completed, **PARKLAB 3D** will deliver a premium automotive simulation experience featuring:

- **Interactive 3D Parking Environment:** Detailed browser-based 3D car parks, kerbs, bays, and road markings powered by Three.js and React Three Fiber.
- **Five UK Driving Test Parking Manoeuvres:**
  - Parallel Parking
  - Forward Bay Parking
  - Reverse Bay Parking
  - Pull Up on the Right and Reverse
  - Precision / Angle Bay Parking
- **Selectable Vehicles:** Multiple vehicles with distinct dimensions, wheelbases, and steering geometry—including the new **Tesla Roadster**.
- **Realistic Driving Controls & Handling:** Responsive steering, acceleration, braking, and turning circle characteristics.
- **Parking Assessment & Performance Scoring:** Automated telemetry evaluation measuring bay alignment, spatial accuracy, collision count, and completion time.

---

## Technology Stack

| Technology | Role |
|---|---|
| **React 18** | Component-based frontend user interface |
| **TypeScript** | Static type safety and domain modelling |
| **Vite** | Fast local development server and optimised production bundler |
| **Three.js** | WebGL 3D rendering engine |
| **React Three Fiber** | Declarative React renderer for Three.js scenes |
| **Drei (`@react-three/drei`)** | Helpers, cameras, staging, and utilities for React Three Fiber |
| **React Router (`react-router-dom`)** | Client-side Single Page Application (SPA) routing |
| **CSS (Custom Properties)** | Global automotive design tokens and responsive layout styling |
| **Lucide React** | Clean, scalable interface iconography |
| **Vercel** | Cloud deployment, CDN hosting, and automatic branch previews |
| **Git / GitHub** | Source control and continuous deployment integration |

---

## Project Architecture

```text
park-lab-3d/
├── public/
│   ├── assets/
│   │   ├── vehicles/          # Future 3D vehicle models (.glb / .gltf)
│   │   ├── environment/       # Future 3D environment props and bay meshes
│   │   └── textures/          # Surface materials, road markings, and HDRIs
│   └── favicon.svg
├── src/
│   ├── app/                   # Root application shell and router setup
│   ├── components/
│   │   ├── layout/            # Shared navigation and page frame components
│   │   ├── ui/                # Reusable UI primitives
│   │   └── screens/           # Top-level route screens
│   ├── features/
│   │   ├── vehicles/          # Vehicle catalogue and handling configs
│   │   ├── challenges/        # UK driving test manoeuvre definitions
│   │   ├── simulation/        # Driving loop, physics state, and HUD
│   │   └── evaluation/        # Telemetry assessment and scoring logic
│   ├── three/
│   │   ├── components/        # Reusable 3D scene objects
│   │   ├── environment/       # Car park geometry and boundaries
│   │   ├── cameras/           # Orbit, chase, and top-down camera rigs
│   │   └── lighting/          # Scene illumination and shadows
│   ├── hooks/                 # Custom React hooks (controls, resize, telemetry)
│   ├── types/                 # Core TypeScript domain interfaces
│   ├── config/                # Application-level configuration
│   ├── constants/             # Route constants and static enumerations
│   ├── styles/                # Global CSS variables and base reset
│   ├── main.tsx               # Application entry point
│   └── vite-env.d.ts          # Vite TypeScript ambient declarations
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── .nvmrc                     # Recommended Node.js version
├── index.html                 # HTML entry template
├── package.json               # Scripts and dependencies
├── tsconfig.json              # TypeScript compiler configuration
├── vercel.json                # Vercel build and SPA rewrite configuration
└── vite.config.ts             # Vite bundler configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20.x` (Node `22` recommended; see `.nvmrc`)
- **npm** `>= 10.x`

### Installation

Install all project dependencies and generate/verify the lockfile:

```bash
npm install
```

### Local Development

Start the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

By default, the application will be available at `http://localhost:5173`.

### Production Build

Run TypeScript validation followed by an optimised production build (outputting to `dist/`):

```bash
npm run typecheck
npm run build
```

### Production Preview

Serve the compiled `dist/` directory locally to verify the production build before deploying:

```bash
npm run preview
```

---

## Vercel Deployment Instructions

This repository is pre-configured with `vercel.json` and `vite.config.ts` for zero-friction deployment to Vercel, including Single Page Application (SPA) fallback rewrites so direct navigation to `/vehicles`, `/challenges`, or `/simulation` works seamlessly on refresh.

### Step-by-Step Deployment

1. **Push the project to a GitHub repository.**
2. **Open [Vercel](https://vercel.com/)** and sign in to your dashboard.
3. **Select "Add New Project"** (`Add New...` → `Project`).
4. **Import the GitHub repository** containing `park-lab-3d`.
5. **Set the Project Root Directory** to the repository root (`./`).
6. **Verify the Framework Preset** is detected as **Vite**.
7. **Verify the Build Command** is set to `npm run build`.
8. **Verify the Output Directory** is set to `dist`.
9. **Click "Deploy"**.

### Continuous Deployment & Environment Variables

- **Automatic Deployments:** Once connected, subsequent pushes to the linked production branch (e.g., `main`) will automatically trigger new production deployments on Vercel, while pull requests will generate isolated preview deployments.
- **Environment Variables:** No environment variables are required for Stage 1. When future stages introduce `VITE_*` variables (documented in `.env.example`), configure them under **Vercel Dashboard → Project Settings → Environment Variables**.

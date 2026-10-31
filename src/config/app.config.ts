import { APP_ROUTES, type AppRoutePath } from '../constants/routes';

export interface NavigationItem {
  label: string;
  path: AppRoutePath;
  stageStatus: 'Ready' | 'Planned';
}

export const APP_CONFIG = {
  name: 'PARKLAB 3D',
  subtitle: 'Interactive 3D UK Driving Test Parking Simulator',
  version: '0.1.0',
  currentStage: 'Stage 1 — Project Scaffolding & Deployment Foundation',
  navigation: [
    { label: 'Overview', path: APP_ROUTES.HOME, stageStatus: 'Ready' },
    {
      label: 'Vehicle Selection',
      path: APP_ROUTES.VEHICLES,
      stageStatus: 'Planned',
    },
    {
      label: 'Challenge Selection',
      path: APP_ROUTES.CHALLENGES,
      stageStatus: 'Planned',
    },
    {
      label: 'Simulation',
      path: APP_ROUTES.SIMULATION,
      stageStatus: 'Planned',
    },
  ] satisfies NavigationItem[],
} as const;

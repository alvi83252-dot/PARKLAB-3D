import { APP_ROUTES, type AppRoutePath } from '../constants/routes';

export interface NavigationItem {
  label: string;
  path: AppRoutePath;
  stageStatus: 'Ready' | 'Planned';
}

export const APP_CONFIG = {
  name: 'PARKLAB 3D',
  subtitle: 'Interactive 3D UK Driving Test Parking Simulator',
  version: '1.0.0',
  currentStage: 'Full Integrated 3D Simulator Release',
  navigation: [
    { label: 'Overview', path: APP_ROUTES.HOME, stageStatus: 'Ready' },
    {
      label: 'Vehicle Selection',
      path: APP_ROUTES.VEHICLES,
      stageStatus: 'Ready',
    },
    {
      label: 'Challenge Selection',
      path: APP_ROUTES.CHALLENGES,
      stageStatus: 'Ready',
    },
    {
      label: 'Simulation',
      path: APP_ROUTES.SIMULATION,
      stageStatus: 'Ready',
    },
  ] satisfies NavigationItem[],
} as const;

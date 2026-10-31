/**
 * Application Route Constants
 */

export const APP_ROUTES = {
  HOME: '/',
  VEHICLES: '/vehicles',
  CHALLENGES: '/challenges',
  SIMULATION: '/simulation',
} as const;

export type AppRoutePath = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

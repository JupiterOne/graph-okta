export * from './applications';
export * from './devices';
export * from './factorDevices';
export * from './users';
export * from './client';

/**
 * Account information derived from the domain/url.
 */
export interface OktaAccountInfo {
  name: string;
  preview: boolean;
}

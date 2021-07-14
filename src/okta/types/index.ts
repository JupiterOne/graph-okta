export * from './applications';
export * from './client';
export * from './devices';
export * from './groups';
export * from './users';
export * from './rules';

/**
 * Account information derived from the domain/url.
 */
export interface OktaAccountInfo {
  name: string;
  preview: boolean;
}

export interface OktaResource {
  id: string;
}

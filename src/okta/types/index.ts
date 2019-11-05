export * from "./applications";
export * from "./client";
export * from "./cache";
export * from "./devices";
export * from "./groups";
export * from "./users";

/**
 * Account information derived from the domain/url.
 */
export interface OktaAccountInfo {
  name: string;
  preview: boolean;
}

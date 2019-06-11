import { IntegrationCache } from "@jupiterone/jupiter-managed-integration-sdk";

import { OktaFactor, OktaUser, OktaUserGroup } from "./types";

export interface OktaUserCacheData {
  user: OktaUser;
  factors: OktaFactor[];
  userGroups: OktaUserGroup[];
}

export interface OktaUserCacheEntry {
  key: string;
  data?: OktaUserCacheData;
}

export function createUserCache(cache: IntegrationCache) {
  return {
    putIds: async (userIds: string[]) => {
      await cache.putEntry({
        key: "userIds",
        data: userIds,
      });
    },

    getIds: async () => {
      const entry = await cache.getEntry("userIds");
      if (entry) {
        return entry.data as string[];
      }
    },

    getEntries: async (keys: string[]): Promise<OktaUserCacheEntry[]> => {
      return cache.getEntries(keys);
    },

    putEntries: async (entries: OktaUserCacheEntry[]) => {
      await cache.putEntries(entries);
    },

    putData: async (data: OktaUserCacheData) => {
      await cache.putEntry({
        key: `users/${data.user.id}`,
        data,
      });
    },

    getData: async (userId: string) => {
      const entry = await cache.getEntry(`users/${userId}`);
      if (entry) {
        return entry.data;
      } else {
        throw new Error(
          `User data not found in cache for userId '${userId}', something is wrong`,
        );
      }
    },
  };
}

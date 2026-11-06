import { type HostStorage } from "#/lib/host/types";

/** The web keeps account rows in memory and nothing on the device. */
export const webStorage: HostStorage = {
  cacheAccountRows: (config) => config,
  deviceCollection: () => null
};

import { type RequestLogger } from "@uni-stack/logger/server";

export type ClerkContextAuth = {
  userId: string;
};

export type OrpcContext = {
  auth: ClerkContextAuth | null;
  logger: RequestLogger;
};

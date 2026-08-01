import { type RequestLogger } from "@tsu-stack/logger/server";

export type ClerkContextAuth = {
  userId: string;
};

export type OrpcContext = {
  auth: ClerkContextAuth | null;
  logger: RequestLogger;
  session: null;
};

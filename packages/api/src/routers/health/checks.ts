import process from "node:process";

import { type HealthCheckResult, type HealthStatus } from "@uni-stack/core/health";
import { checkIsDbReady } from "@uni-stack/db";
import { ENV_SERVER } from "@uni-stack/env/server/env";

// #region Config

const HEALTHCHECK_TIMEOUT_MS = 1_500;

// #region Utils

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function runCheck(check: () => Promise<object>): Promise<HealthCheckResult> {
  const startedAt = performance.now();
  try {
    const data = await withTimeout(check(), HEALTHCHECK_TIMEOUT_MS);
    const latencyMs = Math.round(performance.now() - startedAt);
    const result = data as { status?: HealthStatus };
    if (result.status === "unhealthy") return { ...data, latencyMs, status: "unhealthy" };
    return { ...data, latencyMs, status: "healthy" };
  } catch (error) {
    return {
      error: getErrorMessage(error),
      latencyMs: Math.round(performance.now() - startedAt),
      status: "unhealthy"
    };
  }
}

export function buildBaseHealth() {
  return {
    buildSha: ENV_SERVER.SOURCE_COMMIT,
    environment: ENV_SERVER.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeMs: Math.floor(process.uptime() * 1000),
    url: ENV_SERVER.VITE_SERVER_URL
  };
}

// #region Service Checks
async function checkDatabase() {
  const isReady = await checkIsDbReady();
  return { status: isReady ? "healthy" : "unhealthy" };
}

// TODO: Add future checks here with their corresponding functions, ex: { redis: checkRedis, ... }
const serviceChecks = {
  database: checkDatabase
} satisfies Record<string, () => Promise<object>>;

export async function runServiceChecks() {
  const entries = await Promise.all(
    Object.entries(serviceChecks).map(async ([name, check]) => [name, await runCheck(check)])
  );
  return Object.fromEntries(entries) as Record<string, HealthCheckResult>;
}

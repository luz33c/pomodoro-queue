import { live } from "#/routers/health/procedures/live";
import { ready } from "#/routers/health/procedures/ready";

export const healthRouter = {
  live,
  ready
};

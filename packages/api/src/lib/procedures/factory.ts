import { ORPCError, os } from "@orpc/server";

import { type OrpcContext } from "#/lib/context/types";

const o = os.$context<OrpcContext>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.auth?.userId) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      auth: context.auth
    }
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth).route({
  spec: (spec) => {
    return {
      ...spec,
      security: [{ clerkBearer: [] }]
    };
  }
});

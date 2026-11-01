import { protectedProcedure } from "#/orpc/procedures";

export const data = protectedProcedure
  .route({
    description: "Test retrieving private data for authenticated users",
    method: "GET"
  })
  .handler(({ context }) => {
    return {
      message: "This is private",
      user: context.auth
    };
  });

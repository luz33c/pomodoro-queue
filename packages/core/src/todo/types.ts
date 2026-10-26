import { z } from "zod";

export const TodoTitleSchema = z.string().trim().min(1).max(500);

/** A todo as clients hold it: the `todo` shape's columns in camelCase, timestamps parsed to Date. */
export const TodoRowSchema = z.object({
  completed: z.boolean(),
  createdAt: z.date(),
  id: z.uuid(),
  ownerId: z.string(),
  title: TodoTitleSchema,
  updatedAt: z.date()
});

export type TodoRow = z.infer<typeof TodoRowSchema>;

/** Clients generate the id so an offline create can be replayed without writing a second row. */
export const TodoCreateInputSchema = z.object({
  id: z.uuid(),
  title: TodoTitleSchema
});

export type TodoCreateInput = z.infer<typeof TodoCreateInputSchema>;

export const TodoUpdateInputSchema = z
  .object({
    completed: z.boolean().optional(),
    id: z.uuid(),
    title: TodoTitleSchema.optional()
  })
  .refine((input) => input.completed !== undefined || input.title !== undefined, {
    message: "Provide at least one field to update"
  });

export type TodoUpdateInput = z.infer<typeof TodoUpdateInputSchema>;

export const TodoIdInputSchema = z.object({
  id: z.uuid()
});

export type TodoIdInput = z.infer<typeof TodoIdInputSchema>;

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    return await ctx.db
      .query('todos')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .collect();
  },
});

export const create = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const newTodoId = await ctx.db.insert('todos', {
      text: args.text,
      completed: false,
      userId: identity.subject,
    });
    return await ctx.db.get(newTodoId);
  },
});

export const toggle = mutation({
  args: {
    id: v.id('todos'),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    // 验证todo属于当前用户
    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== identity.subject) {
      throw new Error('Todo not found or access denied');
    }
    await ctx.db.patch(args.id, { completed: args.completed });
    return { success: true };
  },
});

export const deleteTodo = mutation({
  args: {
    id: v.id('todos'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    // 验证todo属于当前用户
    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== identity.subject) {
      throw new Error('Todo not found or access denied');
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

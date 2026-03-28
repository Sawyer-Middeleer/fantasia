import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByAudit = query({
  args: { auditId: v.id("audits") },
  handler: async (ctx, { auditId }) => {
    return ctx.db
      .query("fixOperations")
      .withIndex("by_audit", (q) => q.eq("auditId", auditId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("fixOperations") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    auditId: v.id("audits"),
    userId: v.id("users"),
    type: v.string(),
    issueIds: v.array(v.string()),
    preview: v.any(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("fixOperations", {
      ...args,
      status: "preview",
      createdAt: Date.now(),
    });
  },
});

export const markExecuted = mutation({
  args: {
    id: v.id("fixOperations"),
    snapshot: v.any(),
  },
  handler: async (ctx, { id, snapshot }) => {
    const now = Date.now();
    await ctx.db.patch(id, {
      status: "executed",
      snapshot,
      executedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});

export const markUndone = mutation({
  args: { id: v.id("fixOperations") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: "undone",
      undoneAt: Date.now(),
    });
  },
});

export const markFailed = mutation({
  args: {
    id: v.id("fixOperations"),
    error: v.string(),
  },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      status: "failed",
      error,
    });
  },
});

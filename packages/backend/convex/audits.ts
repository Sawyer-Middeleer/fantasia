import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("audits") },
  handler: async (ctx, { id }) => {
    const audit = await ctx.db.get(id);
    if (!audit) return null;

    // Include issue count
    const issues = await ctx.db
      .query("auditIssues")
      .withIndex("by_audit", (q) => q.eq("auditId", id))
      .collect();

    return { ...audit, issueCount: issues.length };
  },
});

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("audits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    hubspotConnectionId: v.optional(v.id("hubspotConnections")),
    status: v.string(),
    totalContacts: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    grade: v.optional(v.string()),
    categoryScores: v.optional(v.any()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("audits", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("audits"),
    status: v.optional(v.string()),
    healthScore: v.optional(v.number()),
    grade: v.optional(v.string()),
    categoryScores: v.optional(v.any()),
    totalContacts: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }
  },
});

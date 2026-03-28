import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByAudit = query({
  args: { auditId: v.id("audits") },
  handler: async (ctx, { auditId }) => {
    return ctx.db
      .query("auditIssues")
      .withIndex("by_audit", (q) => q.eq("auditId", auditId))
      .collect();
  },
});

export const markFixed = mutation({
  args: {
    id: v.id("auditIssues"),
    fixSnapshot: v.any(),
  },
  handler: async (ctx, { id, fixSnapshot }) => {
    await ctx.db.patch(id, {
      fixedAt: Date.now(),
      fixSnapshot,
    });
  },
});

export const clearFixed = mutation({
  args: { id: v.id("auditIssues") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      fixedAt: undefined,
      fixSnapshot: undefined,
    });
  },
});

export const insertBatch = mutation({
  args: {
    issues: v.array(
      v.object({
        auditId: v.id("audits"),
        category: v.string(),
        severity: v.string(),
        hubspotRecordIds: v.array(v.string()),
        details: v.any(),
      })
    ),
  },
  handler: async (ctx, { issues }) => {
    const ids = [];
    for (const issue of issues) {
      const id = await ctx.db.insert("auditIssues", issue);
      ids.push(id);
    }
    return ids;
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("hubspotConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    userId: v.id("users"),
    portalId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    scopes: v.array(v.string()),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hubspotConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        portalId: args.portalId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        scopes: args.scopes,
        tokenExpiresAt: args.tokenExpiresAt,
        connectedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("hubspotConnections", {
      userId: args.userId,
      portalId: args.portalId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      scopes: args.scopes,
      tokenExpiresAt: args.tokenExpiresAt,
      connectedAt: Date.now(),
    });
  },
});

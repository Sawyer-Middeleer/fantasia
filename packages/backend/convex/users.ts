import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (!user) return null;
    // Never return passwordHash to the client
    const { passwordHash: _, ...safe } = user;
    return safe;
  },
});

export const createWithPassword = mutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, { email, passwordHash }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("Email already registered");
    }

    return ctx.db.insert("users", {
      email,
      passwordHash,
      plan: "free",
    });
  },
});

export const updatePlan = mutation({
  args: {
    id: v.id("users"),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, { id, plan, stripeCustomerId }) => {
    const patch: Record<string, string> = { plan };
    if (stripeCustomerId) patch.stripeCustomerId = stripeCustomerId;
    await ctx.db.patch(id, patch);
  },
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    // Linear scan since we don't have a dedicated index — acceptable for webhook volume
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.stripeCustomerId === stripeCustomerId) ?? null;
  },
});

export const upsertByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return existing._id;
    }

    return ctx.db.insert("users", {
      email,
      plan: "free",
    });
  },
});

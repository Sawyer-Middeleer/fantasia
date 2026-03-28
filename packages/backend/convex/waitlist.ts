import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const add = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Deduplicate
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert("waitlist", { email });
  },
});

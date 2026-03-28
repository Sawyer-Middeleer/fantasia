import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    plan: v.string(), // "free" | "starter" | "pro" | "team"
  }).index("by_email", ["email"]),

  hubspotConnections: defineTable({
    userId: v.id("users"),
    portalId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    scopes: v.array(v.string()),
    tokenExpiresAt: v.number(),
    connectedAt: v.number(),
  }).index("by_user", ["userId"]),

  audits: defineTable({
    userId: v.id("users"),
    hubspotConnectionId: v.optional(v.id("hubspotConnections")),
    status: v.string(), // "pending" | "running" | "complete" | "failed"
    totalContacts: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    grade: v.optional(v.string()),
    categoryScores: v.optional(v.any()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  auditIssues: defineTable({
    auditId: v.id("audits"),
    category: v.string(), // "duplicate" | "stale" | "missing_field" | "format"
    severity: v.string(), // "low" | "medium" | "high" | "critical"
    hubspotRecordIds: v.array(v.string()),
    details: v.any(),
    fixedAt: v.optional(v.number()),
    fixSnapshot: v.optional(v.any()),
  }).index("by_audit", ["auditId"]),

  fixOperations: defineTable({
    auditId: v.id("audits"),
    userId: v.id("users"),
    type: v.string(), // "merge_duplicates" | "normalize_format"
    status: v.string(), // "preview" | "executed" | "undone" | "failed"
    issueIds: v.array(v.string()), // auditIssue IDs targeted
    preview: v.any(), // what will change
    snapshot: v.optional(v.any()), // pre-fix state for undo
    executedAt: v.optional(v.number()),
    undoneAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // 30 days after execution
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_audit", ["auditId"])
    .index("by_user", ["userId"]),

  waitlist: defineTable({
    email: v.string(),
  }).index("by_email", ["email"]),
});

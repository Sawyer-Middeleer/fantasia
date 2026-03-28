export const PLANS = {
  free: { name: "Free", priceId: null, fixesAllowed: false },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
    fixesAllowed: false,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    fixesAllowed: true,
  },
  team: {
    name: "Team",
    priceId: process.env.STRIPE_TEAM_PRICE_ID ?? null,
    fixesAllowed: true,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function canUseFixes(plan: string): boolean {
  return PLANS[plan as PlanKey]?.fixesAllowed ?? false;
}

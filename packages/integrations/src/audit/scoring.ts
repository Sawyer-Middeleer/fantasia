import { CategoryScore, AuditResult } from "./types";

const WEIGHTS = {
  duplicates: 0.3,
  stale: 0.25,
  missingFields: 0.25,
  format: 0.2,
};

// Score based on % of records affected
function categoryScore(affectedCount: number, totalRecords: number): number {
  if (totalRecords === 0) return 100;
  const pct = (affectedCount / totalRecords) * 100;

  if (pct === 0) return 100;
  if (pct <= 5) return 85;
  if (pct <= 15) return 70;
  if (pct <= 30) return 50;
  if (pct <= 50) return 30;
  return 10;
}

export function computeCategoryScore(
  affectedCount: number,
  totalRecords: number
): CategoryScore {
  return {
    score: categoryScore(affectedCount, totalRecords),
    affectedCount,
    totalRecords,
    percentAffected:
      totalRecords === 0
        ? 0
        : Math.round((affectedCount / totalRecords) * 1000) / 10,
  };
}

export function computeHealthScore(categories: AuditResult["categories"]): {
  score: number;
  grade: AuditResult["grade"];
} {
  const composite = Math.round(
    categories.duplicates.score * WEIGHTS.duplicates +
      categories.stale.score * WEIGHTS.stale +
      categories.missingFields.score * WEIGHTS.missingFields +
      categories.format.score * WEIGHTS.format
  );

  const score = Math.max(0, Math.min(100, composite));

  let grade: AuditResult["grade"];
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 55) grade = "D";
  else grade = "F";

  return { score, grade };
}

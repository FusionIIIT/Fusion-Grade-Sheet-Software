// ─────────────────────────────────────────────────────────────────────────────
//  Grade → point conversion + optional SPI re-verification.
//
//  Ported from examination/api/views.py:46-124. The approval sheet already
//  carries SPI/CPI, so the app DISPLAYS those values. This module is only used
//  as an optional integrity check: if a recomputed SPI disagrees with the sheet
//  value, we can surface a warning. It does NOT change what is printed.
// ─────────────────────────────────────────────────────────────────────────────

// Base grade → factor (points = factor * 10). views.py:46-48.
const BASE = {
  O: 1.0, "A+": 1.0, A: 0.9, "B+": 0.8, B: 0.7,
  "C+": 0.6, C: 0.5, "D+": 0.4, D: 0.3, F: 0.2, S: 0.0,
};

// grade_conversion lookup. Includes A1..A10, B1..B10 and decimal grades 2.0..10.0
// for PBI/BTP courses (views.py:49-55). Returns -1 for unknown (excluded).
export function gradeFactor(grade) {
  const g = String(grade ?? "").trim();
  if (g in BASE) return BASE[g];

  const am = /^A([1-9]|10)$/.exec(g);
  if (am) return +(0.9 + Number(am[1]) * 0.01).toFixed(2);

  const bm = /^B([1-9]|10)$/.exec(g);
  if (bm) return +(0.8 + Number(bm[1]) * 0.01).toFixed(2);

  // Decimal grades "2.0".."10.0" → factor /10 (e.g. "8.3" → 0.83).
  if (/^\d+(\.\d)?$/.test(g)) {
    const n = Number(g);
    if (n >= 2.0 && n <= 10.0) return +(n / 10).toFixed(2);
  }
  return -1;
}

// ROUND_HALF_UP to 1 decimal place (views.py:87-90).
function roundHalfUp1(x) {
  return (Math.round((x + Number.EPSILON) * 10) / 10).toFixed(1);
}

// SPI = 10 * Σ(factor*credit) / Σ(credit), counting only factor >= 0.
// Mirrors calculate_spi_for_student (views.py:92-124).
export function computeSpi(courses) {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const c of courses) {
    const credit = Number(c.credits) || 0;
    const factor = gradeFactor(c.grade);
    if (factor >= 0 && factor !== 0) {
      totalPoints += factor * credit;
      totalCredits += credit;
    }
  }
  if (!totalCredits) return "0.0";
  return roundHalfUp1(10 * (totalPoints / totalCredits));
}

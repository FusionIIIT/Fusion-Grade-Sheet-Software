// ─────────────────────────────────────────────────────────────────────────────
//  Small mapping helpers, all extracted from the Fusion codebase.
// ─────────────────────────────────────────────────────────────────────────────

// Excel "Remarks" value (built in views.py:1515-1518) → grade-sheet special symbol.
//   R(BL) / R(IM) → "R" (Repeated)
//   S(BL) / S(IM) → "S" (Substituted)
//   "-" / empty   → ""  (first attempt)
export function remarkToSymbol(remark) {
  const r = String(remark ?? "").trim().toUpperCase();
  if (r.startsWith("R(")) return "R";
  if (r.startsWith("S(")) return "S";
  return "";
}

// Programme code → full header label (views.py:3887-3893).
const PROGRAMME_FULL = {
  "B.Tech": "Bachelor of Technology",
  "B.Des": "Bachelor of Design",
  "M.Tech": "Master of Technology",
  "M.Des": "Master of Design",
  "PhD": "Doctor of Philosophy",
};

export function programmeFullName(programme) {
  if (!programme) return programme;
  if (PROGRAMME_FULL[programme]) return PROGRAMME_FULL[programme];
  // M.Tech variants ("M.Tech AI & ML", ...) → "Master of Technology"
  if (/^m\.tech/i.test(programme)) return "Master of Technology";
  if (/^b\.tech/i.test(programme)) return "Bachelor of Technology";
  if (/^m\.des/i.test(programme)) return "Master of Design";
  if (/^b\.des/i.test(programme)) return "Bachelor of Design";
  if (/^ph\.?d/i.test(programme)) return "Doctor of Philosophy";
  return programme;
}

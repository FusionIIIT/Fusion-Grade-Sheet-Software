// ─────────────────────────────────────────────────────────────────────────────
//  Merge several semester approval sheets of the SAME batch into:
//    • a "target" sheet (the latest semester — the one whose grade sheets we render)
//    • a per-roll semester history that drives the portal's graduation grid.
//
//  Each sheet gives, per student: that semester's SPI, the cumulative CPI, and TU
//  (cumulative credits). Collecting those across all uploaded semesters reproduces
//  the `semester_history` the portal builds from its database.
// ─────────────────────────────────────────────────────────────────────────────

const isSummerType = (t) => !!(t && t.toLowerCase().includes("summer"));

// Sort key: later semester wins; a regular semester ranks after the summer that
// shares its number (matches the portal's column order).
const rankOf = (meta) => meta.semester.no * 2 + (isSummerType(meta.semester.type) ? 0 : 1);

/**
 * @param items [{ meta, parsed }]  one entry per uploaded sheet
 * @returns { target:{meta,parsed}, historyByRoll, semesters:[], multi:boolean }
 */
export function mergeSemesterSheets(items) {
  const target = items.reduce((a, b) => (rankOf(b.meta) > rankOf(a.meta) ? b : a));

  // A single sheet has no usable history → keep the simple Result line (no grid).
  if (items.length === 1) {
    return { target, historyByRoll: {}, semesters: [target.meta.semester], multi: false };
  }

  const historyByRoll = {};
  for (const it of items) {
    const summer = isSummerType(it.meta.semester.type);
    for (const s of it.parsed.students) {
      (historyByRoll[s.rollNo] ||= []).push({
        semester: it.meta.semester.no,
        spi: parseFloat(s.spi) || 0,
        cpi: parseFloat(s.cpi) || 0,
        cumulative_credits: s.tu != null ? Number(s.tu) : 0,
        is_summer: summer,
      });
    }
  }
  for (const roll in historyByRoll) {
    historyByRoll[roll].sort(
      (a, b) => a.semester - b.semester || (a.is_summer ? 0 : 1) - (b.is_summer ? 0 : 1)
    );
  }

  const semesters = items
    .map((i) => i.meta.semester)
    .sort((a, b) => rankOf({ semester: a }) - rankOf({ semester: b }));

  return { target, historyByRoll, semesters, multi: true };
}

// Validate that all uploaded sheets belong to the same batch (programme + discipline).
export function validateSameBatch(items) {
  if (items.length <= 1) return null;
  const prog = items[0].meta.programme;
  const disc = items[0].meta.disciplineAcronym;
  for (const it of items) {
    if (it.meta.programme !== prog || it.meta.disciplineAcronym !== disc) {
      return `All files must be the same batch. Found ${prog}/${disc} and ${it.meta.programme}/${it.meta.disciplineAcronym}.`;
    }
  }
  // Duplicate semester check.
  const seen = new Set();
  for (const it of items) {
    const key = `${it.meta.semester.no}-${it.meta.semester.type}`;
    if (seen.has(key)) return `Two files have the same semester (${it.meta.semester.label}). Upload one sheet per semester.`;
    seen.add(key);
  }
  return null;
}

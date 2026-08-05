// ─────────────────────────────────────────────────────────────────────────────
//  Merge several semester approval sheets of the SAME batch into:
//    • a per-student FINAL sheet — the last term the student actually registered
//      graded courses in. That is the sheet the graduation grid belongs on, and
//      it differs per student (most finish at VIII, a few at a summer term).
//    • a per-roll semester history that drives the portal's graduation grid.
//
//  Each sheet gives, per student: that semester's SPI, the cumulative CPI, and TU
//  (cumulative credits). Collecting those across all uploaded semesters reproduces
//  the `semester_history` the portal builds from its database.
// ─────────────────────────────────────────────────────────────────────────────

const isSummerType = (t) => !!(t && t.toLowerCase().includes("summer"));

// Chronological sort key: a summer term follows the regular semester sharing its
// number, matching the grid's column order (… VII, VIII, Summer).
const rankOf = (meta) => meta.semester.no * 2 + (isSummerType(meta.semester.type) ? 1 : 0);

// No graded course in a term means no registration in it.
const hasCourses = (s) => Array.isArray(s.courses) && s.courses.length > 0;

/**
 * @param items [{ meta, parsed }]  one entry per uploaded sheet
 * @returns { target, students, metaByRoll, historyByRoll, semesters, multi }
 */
export function mergeSemesterSheets(items) {
  const target = items.reduce((a, b) => (rankOf(b.meta) > rankOf(a.meta) ? b : a));

  // A single sheet has no usable history → keep the simple Result line (no grid).
  if (items.length === 1) {
    return {
      target,
      students: target.parsed.students,
      metaByRoll: {},
      historyByRoll: {},
      semesters: [target.meta.semester],
      multi: false,
    };
  }

  const historyByRoll = {};
  const finalByRoll = {}; // last term WITH courses — the sheet we render
  const seenByRoll = {}; // last appearance of any kind — fallback only
  for (const it of items) {
    const summer = isSummerType(it.meta.semester.type);
    const rank = rankOf(it.meta);
    for (const s of it.parsed.students) {
      const pick = { rank, meta: it.meta, student: s };
      if (!seenByRoll[s.rollNo] || rank > seenByRoll[s.rollNo].rank) seenByRoll[s.rollNo] = pick;
      // An ungraded term neither becomes a grid column nor ends the programme.
      if (!hasCourses(s)) continue;
      (historyByRoll[s.rollNo] ||= []).push({
        semester: it.meta.semester.no,
        spi: parseFloat(s.spi) || 0,
        cpi: parseFloat(s.cpi) || 0,
        cumulative_credits: s.tu != null ? Number(s.tu) : 0,
        is_summer: summer,
      });
      if (!finalByRoll[s.rollNo] || rank > finalByRoll[s.rollNo].rank) finalByRoll[s.rollNo] = pick;
    }
  }
  for (const roll in historyByRoll) {
    historyByRoll[roll].sort(
      (a, b) => a.semester - b.semester || (a.is_summer ? 1 : 0) - (b.is_summer ? 1 : 0)
    );
  }

  // One row per student, taken from whichever term they last registered in.
  const metaByRoll = {};
  const students = Object.keys(seenByRoll)
    .sort()
    .map((roll) => {
      const pick = finalByRoll[roll] || seenByRoll[roll];
      metaByRoll[roll] = pick.meta;
      return pick.student;
    });

  const semesters = items
    .map((i) => i.meta.semester)
    .sort((a, b) => rankOf({ semester: a }) - rankOf({ semester: b }));

  return { target, students, metaByRoll, historyByRoll, semesters, multi: true };
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

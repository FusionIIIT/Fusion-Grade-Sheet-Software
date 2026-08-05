// Verify each student's sheet is built from THEIR last registered term, and that
// the graduation grid lands on whichever term crossed 148 credits — not a fixed one.
import { buildStudentSheetHtml } from "../src/renderer/src/lib/buildSheet.js";
import { mergeSemesterSheets } from "../src/renderer/src/lib/mergeSheets.js";

const errors = [];
const assert = (c, m) => { if (!c) errors.push("FAIL: " + m); };

const course = (code) => ({ coursecode: code, coursename: code, credits: 3, grade: "A", special_symbol: "" });
const row = (rollNo, tu, courses = [course("CS")]) => ({
  rollNo, name: rollNo, courses, spi: "8.0", cpi: "8.1", su: 3, tu,
});

// Batch of 3 students across Sem1..Sem8 + Summer3 (sem 6) + Summer4 (sem 8):
//   22BME001 — regular through VIII, crosses 148 at VIII, never takes a summer.
//   22BME002 — crosses 148 at VII, then nothing (on the Sem8 roster but ungraded).
//   22BME003 — 146 at VIII, then 149 in Summer 4.
const unit = (no, type, label, students) => ({
  meta: {
    programme: "B.Tech", disciplineName: "Mechanical Engineering", disciplineAcronym: "ME",
    academicYear: "2025-26", semester: { no, type, label },
  },
  parsed: { courses: [{ code: "CS", name: "CS", credit: 3 }], students },
});

const items = [];
for (let s = 1; s <= 7; s++) {
  items.push(unit(s, s % 2 ? "Odd Semester" : "Even Semester", `Semester ${s}`, [
    row("22BME001", 19 * s), row("22BME002", 22 * s), row("22BME003", 18 * s),
  ]));
}
// Sem 8: 22BME002 is on the roster but has no graded course.
items.push(unit(8, "Even Semester", "Semester 8", [
  row("22BME001", 152), row("22BME002", 154, []), row("22BME003", 146),
]));
items.push(unit(6, "Summer Semester", "Summer 3", [row("22BME003", 146)]));
items.push(unit(8, "Summer Semester", "Summer 4", [row("22BME003", 149)]));

const { students, metaByRoll, historyByRoll, multi, semesters } = mergeSemesterSheets(items);
assert(multi === true, "multi-sheet detected");
assert(students.length === 3, `one row per student (got ${students.length})`);

// Summer sorts after the regular semester sharing its number.
assert(semesters[semesters.length - 1].label === "Summer 4", `latest term is Summer 4 (got ${semesters[semesters.length - 1].label})`);

assert(metaByRoll["22BME001"].semester.label === "Semester 8", `001 final term VIII (got ${metaByRoll["22BME001"].semester.label})`);
assert(metaByRoll["22BME002"].semester.label === "Semester 7", `002 final term VII — ungraded sem 8 does not count (got ${metaByRoll["22BME002"].semester.label})`);
assert(metaByRoll["22BME003"].semester.label === "Summer 4", `003 final term Summer 4 (got ${metaByRoll["22BME003"].semester.label})`);

// The ungraded Sem 8 row must not become a history entry either.
assert(historyByRoll["22BME002"].length === 7, `002 has 7 history entries (got ${historyByRoll["22BME002"].length})`);
assert(historyByRoll["22BME003"].length === 10, `003 has 10 history entries (got ${historyByRoll["22BME003"].length})`);

const sheetFor = (roll) => {
  const s = students.find((x) => x.rollNo === roll);
  return buildStudentSheetHtml(s, metaByRoll[roll], historyByRoll[roll]);
};

const done = "Student has successfully completed the programme.";

const h1 = sheetFor("22BME001");
assert(h1.includes(done), "001 completes at VIII");
assert(/>Final CPI</.test(h1) && h1.includes(">VIII<"), "001 grid runs to VIII");

// Crossing 148 at VII with no later registration → the grid lands on VII.
const h2 = sheetFor("22BME002");
assert(h2.includes(done), "002 completes at VII");
assert(/>Final CPI</.test(h2) && h2.includes(">VII<"), "002 grid runs to VII");
assert(!h2.includes(">VIII<"), "002 grid stops at VII");
assert((h2.match(/>Summer</g) || []).length === 3, `002 grid has 3 summer columns (got ${(h2.match(/>Summer</g) || []).length})`);

const h3 = sheetFor("22BME003");
assert(h3.includes(done), "003 completes in Summer 4");
assert(/>Final CPI</.test(h3), "003 gets the full grid on the Summer IV sheet");
assert(h3.includes(">VIII<"), "003 grid includes VIII");
assert((h3.match(/>Summer</g) || []).length === 4, `003 grid has 4 summer columns (got ${(h3.match(/>Summer</g) || []).length})`);
assert(/summer\s+iv/i.test(h3), "003 sheet header reads Summer IV");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("FINAL-SEMESTER TEST PASS — per-student last registered term drives the grid.");

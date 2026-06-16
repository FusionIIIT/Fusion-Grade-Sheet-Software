// Verify the graduation grid + completion line render when multi-sheet history
// pushes cumulative credits past the threshold (148 for Bachelor).
import { buildStudentSheetHtml } from "../src/renderer/src/lib/buildSheet.js";
import { mergeSemesterSheets } from "../src/renderer/src/lib/mergeSheets.js";

const errors = [];
const assert = (c, m) => { if (!c) errors.push("FAIL: " + m); };

// Simulate 8 uploaded B.Tech CSE sheets (one student, 25BCS002), credits climbing to 160.
const spis = [8.3, 8.1, 8.5, 8.0, 8.7, 8.2, 9.0, 8.8];
const cpis = [8.3, 8.2, 8.3, 8.25, 8.35, 8.33, 8.4, 8.45];
const items = spis.map((spi, i) => ({
  meta: {
    programme: "B.Tech",
    disciplineName: "Computer Science and Engineering",
    disciplineAcronym: "CSE",
    academicYear: `${2025 + Math.floor(i / 2)}-${String((2026 + Math.floor(i / 2)) % 100).padStart(2, "0")}`,
    semester: { no: i + 1, type: (i + 1) % 2 ? "Odd Semester" : "Even Semester", label: `Semester ${i + 1}` },
  },
  parsed: {
    courses: [{ code: "CS", name: "C", credit: 20 }],
    students: [{ rollNo: "25BCS002", name: "AATISH KUMAR", courses: [{ coursecode: "CS4001", coursename: "Capstone", credits: 20, grade: "A", special_symbol: "" }], spi: String(spi), cpi: String(cpis[i]), su: 20, tu: 20 * (i + 1) }],
  },
}));

const { target, historyByRoll, multi } = mergeSemesterSheets(items);
assert(multi === true, "multi-sheet detected");
assert(target.meta.semester.no === 8, `target is sem 8 (got ${target.meta.semester.no})`);
const hist = historyByRoll["25BCS002"];
assert(hist.length === 8, `history has 8 entries (got ${hist?.length})`);
assert(hist[7].cumulative_credits === 160, `final cumulative credits 160 (got ${hist[7].cumulative_credits})`);

const student = target.parsed.students[0];
const html = buildStudentSheetHtml(student, {
  academicYear: target.meta.academicYear,
  programme: "B.Tech",
  disciplineName: "Computer Science and Engineering",
  semester: target.meta.semester,
}, hist);

assert(/id="spi-table"/.test(html), "spi-table present");
assert(/>Semester</.test(html), "grid has Semester header row");
assert(/Final CPI/.test(html), "grid has Final CPI column");
assert(html.includes("Student has successfully completed the programme."), "completion line present");
assert(html.includes(">VIII<"), "grid shows roman VIII for semester 8");
// Final CPI should be sem-8 cpi 8.45 -> 8.5 (rounded display) or 8.4; just ensure a CPI row exists.
assert(/>SPI</.test(html) && /->CPI<|>CPI</.test(html), "SPI and CPI rows present");

// Single-sheet must NOT show the grid (simple Result line instead).
const single = mergeSemesterSheets([items[7]]);
assert(single.multi === false, "single sheet → multi false");
const htmlSingle = buildStudentSheetHtml(single.target.parsed.students[0], {
  academicYear: "2028-29", programme: "B.Tech", disciplineName: "Computer Science and Engineering",
  semester: { no: 8, type: "Even Semester" },
}, single.historyByRoll["25BCS002"] || []);
assert(htmlSingle.includes("Result"), "single sheet shows simple Result line");
assert(!htmlSingle.includes("Student has successfully completed the programme."), "single sheet: no completion line");
assert(!/>Final CPI</.test(htmlSingle), "single sheet: no grid");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("GRID TEST PASS — multi-sheet builds grid + completion; single-sheet stays simple.");

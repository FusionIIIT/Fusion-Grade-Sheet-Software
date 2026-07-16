// Self-test: build a synthetic approval sheet matching the portal's GenerateResultAPI
// layout (using image 3's data for 25BCS002), parse it, build the grade-sheet HTML,
// and assert the key facts. Run with: node scripts/selftest.mjs
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { parseApprovalSheet } from "../src/renderer/src/lib/parseApprovalSheet.js";
import { buildStudentSheetHtml } from "../src/renderer/src/lib/buildSheet.js";
import { computeSpi } from "../src/renderer/src/lib/gradeData.js";

// Courses from image 3 (B.Tech CSE 2025, Semester 1).
const courses = [
  { code: "NS1001", name: "Mathematics-I", credit: 4 },
  { code: "NS1002", name: "Engineering Mechanics", credit: 4 },
  { code: "HS1001", name: "Effective Communications", credit: 2 },
  { code: "ES1002", name: "Fundamentals of Electrical and Electronics Engineering", credit: 4 },
  { code: "IT1001", name: "Introduction to Programming In C", credit: 3 },
  { code: "CS1001", name: "Introduction to Profession", credit: 1 },
];
// 25BCS002 grades from image 3.
const grades = ["A", "B+", "B+", "A", "B", "S"];

// Build the worksheet exactly like views.py:1338-1553 (AOA + merges).
const aoa = [];
const row1 = ["S. No", "Roll No", "Name"];
const row2 = ["", "", ""];
const row3 = ["", "", ""];
const row4 = ["", "", ""];
courses.forEach((c) => {
  row1.push(c.code, null);
  row2.push(c.name, null);
  row3.push(c.credit, null);
  row4.push("Grade", "Remarks");
});
["SPI", "CPI", "SU", "TU", "SP", "TP", "WARNING"].forEach((h) => {
  row1.push(h);
  row2.push(null); row3.push(null); row4.push(null);
});
aoa.push(row1, row2, row3, row4);

// One data row for 25BCS002.
const dataRow = [1, "25BCS002", "AATISH KUMAR"];
grades.forEach((g) => dataRow.push(g, "-"));
dataRow.push(8.3, 8.3, 18, 18, 149.4, 149.4, "");
aoa.push(dataRow);

const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Student Grades");
const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

// Parse it back.
const parsed = parseApprovalSheet(buf);
const errors = [];
const assert = (cond, msg) => { if (!cond) errors.push("FAIL: " + msg); };

assert(parsed.students.length === 1, `students=1 (got ${parsed.students.length})`);
assert(parsed.courses.length === 6, `courses=6 (got ${parsed.courses.length})`);
const s = parsed.students[0];
assert(s.rollNo === "25BCS002", `roll 25BCS002 (got ${s.rollNo})`);
assert(s.name === "AATISH KUMAR", `name (got ${s.name})`);
assert(s.courses.length === 6, `student courses=6 (got ${s.courses.length})`);
assert(s.courses[0].coursecode === "NS1001", `c0 code (got ${s.courses[0].coursecode})`);
assert(s.courses[0].coursename === "Mathematics-I", `c0 name (got ${s.courses[0].coursename})`);
assert(String(s.courses[0].credits) === "4", `c0 credit (got ${s.courses[0].credits})`);
assert(s.courses[0].grade === "A", `c0 grade (got ${s.courses[0].grade})`);
assert(s.courses[5].grade === "S", `c5 grade S (got ${s.courses[5].grade})`);
assert(s.spi === "8.3", `spi 8.3 (got ${s.spi})`);
assert(s.cpi === "8.3", `cpi 8.3 (got ${s.cpi})`);

// SPI recompute check (4*9 + 4*8 + 2*8 + 4*9 + 3*7 + S(excluded)) / (4+4+2+4+3)
// = (36+32+16+36+21)/17 = 141/17 = 8.294 -> 8.3
const recomputed = computeSpi(s.courses);
assert(recomputed === "8.3", `recomputed SPI 8.3 (got ${recomputed})`);

// Build HTML and spot-check key strings.
const html = buildStudentSheetHtml(s, {
  academicYear: "2025-26",
  programme: "B.Tech",
  disciplineName: "Computer Science and Engineering",
  disciplineAcronym: "CSE",
  semester: { no: 1, type: "Odd Semester", label: "Semester 1" },
});
writeFileSync(new URL("../selftest-output.html", import.meta.url), html);
assert(html.includes("Bachelor of Technology"), "programme full name in HTML");
assert(html.includes("Computer Science and Engineering"), "discipline in HTML");
assert(html.includes("2025-2026"), "academic year shown in full (2025-2026) in HTML");
assert(html.includes("25BCS002"), "roll in HTML");
assert(html.includes("Minimum Graduating CPI: 5.0"), "min CPI 5.0 (bachelor)");
assert(html.includes("SPI &nbsp;&nbsp; 8.3"), "Result SPI 8.3 line");
assert(html.includes("CPI &nbsp;&nbsp; 8.3"), "Result CPI 8.3 line");
assert(html.includes("Mathematics-I"), "course title in HTML");
assert(/@page[\s\S]*margin-top: 7.5cm/.test(html), "@page 7.5cm top margin preserved");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} assertion(s) failed.`);
  process.exit(1);
}
console.log("ALL PASS — parser, SPI recompute, and template output verified.");
console.log("HTML written to selftest-output.html");

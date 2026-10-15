// Verify the "Export All" combined-PDF filename disambiguates a summer semester
// from the even semester it shares its "no" with (Summer 1 → no: 2, same as
// Semester 2) — otherwise exporting one would silently overwrite the other's
// file on disk. Run with: node scripts/test-export-filename.mjs
import { exportAllFileName } from "../src/renderer/src/lib/buildSheet.js";

const errors = [];
const assert = (c, m) => { if (!c) errors.push("FAIL: " + m); };

const regularSem2 = { disciplineAcronym: "CSE", semester: { no: 2, type: "Even Semester", label: "Semester 2" } };
const summer1 = { disciplineAcronym: "CSE", semester: { no: 2, type: "Summer Semester", label: "Summer 1" } };
const summer2 = { disciplineAcronym: "CSE", semester: { no: 4, type: "Summer Semester", label: "Summer 2" } };

const regName = exportAllFileName(regularSem2, { perStudentSemester: false });
const summerName = exportAllFileName(summer1, { perStudentSemester: false });

assert(regName === "grade_sheets_CSE_Sem2.pdf", `regular sem2 filename (got ${regName})`);
assert(summerName === "grade_sheets_CSE_Summer1.pdf", `summer1 filename (got ${summerName})`);
assert(regName !== summerName, "regular Sem2 and Summer1 must not collide on filename");

const summer2Name = exportAllFileName(summer2, { perStudentSemester: false });
assert(summer2Name === "grade_sheets_CSE_Summer2.pdf", `summer2 filename (got ${summer2Name})`);

// Per-student-semester exports (multi-semester merge) always use the "_final" name,
// regardless of which term happens to be selected.
const finalName = exportAllFileName(summer1, { perStudentSemester: true });
assert(finalName === "grade_sheets_CSE_final.pdf", `per-student final filename (got ${finalName})`);

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("EXPORT-FILENAME TEST PASS — summer and regular semesters no longer collide on export filename.");

import * as XLSX from "xlsx";
import { loadUnitsFromFile } from "../src/renderer/src/lib/loadWorkbook.js";
import { mergeSemesterSheets } from "../src/renderer/src/lib/mergeSheets.js";

const config = { disciplines: [{ name: "Smart Manufacturing", acronym: "SM" }] };

function zeroCourseAOA() {
  return [
    ["S. No", "Roll No", "Name", "SPI", "CPI", "SU", "TU", "SP", "TP", "WARNING"],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [1, "21BSM010", "SUMMER STUDENT", 7.0, 8.0, 4, 150, 0, 0, ""],
  ];
}

function fileFor(name) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zeroCourseAOA()), "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return { name, arrayBuffer: async () => buf };
}

const errors = [];
const assert = (c, m) => { if (!c) errors.push("FAIL: " + m); };

// Summer file with 0 courses must load (no throw), keeping student SPI/CPI/TU.
const summer = await loadUnitsFromFile(fileFor("BTech_SM_2021_Summer1_2021-22.xlsx"), config);
assert(summer.length === 1, "summer unit loaded");
assert(summer[0].meta.semester.type === "Summer Semester", "summer type");
assert(summer[0].parsed.courses.length === 0, "0 courses allowed for summer");
assert(summer[0].parsed.students.length === 1, "summer student kept");
assert(summer[0].parsed.students[0].tu === 150, `summer TU read (got ${summer[0].parsed.students[0].tu})`);

// Regular semester with 0 courses must still ERROR (catches bad/empty files).
let threw = false;
try {
  await loadUnitsFromFile(fileFor("BTech_SM_Sem3_2024-25.xlsx"), config);
} catch {
  threw = true;
}
assert(threw, "regular semester with 0 courses still errors");

// A 0-course summer must NOT create a summer history entry (grid shows "-" not 0.0).
const regUnit = {
  meta: { programme: "B.Tech", disciplineName: "Smart Manufacturing", disciplineAcronym: "SM",
    semester: { no: 8, type: "Even Semester", label: "Semester 8" }, academicYear: "2024-25" },
  parsed: { courses: [{ code: "X", name: "X", credit: 20 }],
    students: [{ rollNo: "21BSM010", name: "SUMMER STUDENT",
      courses: [{ coursecode: "X", coursename: "X", credits: 20, grade: "A", special_symbol: "" }],
      spi: "9.0", cpi: "8.0", su: 20, tu: 160 }] },
};
const { historyByRoll } = mergeSemesterSheets([regUnit, summer[0]]);
const hist = historyByRoll["21BSM010"] || [];
assert(hist.length === 1, `only regular entry kept, summer omitted (got ${hist.length})`);
assert(!hist.some((h) => h.is_summer), "no summer history entry for 0-course summer");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("SUMMER-EMPTY TEST PASS — 0-course summer loads, errors only for regular, and is omitted from the grid.");

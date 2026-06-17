// Verify a single workbook with one tab per semester expands into per-semester
// units (the "one file, multiple tabs" upload path) and merges into the grid.
import * as XLSX from "xlsx";
import { loadAllUnits } from "../src/renderer/src/lib/loadWorkbook.js";
import { mergeSemesterSheets } from "../src/renderer/src/lib/mergeSheets.js";

const config = { disciplines: [{ name: "Smart Manufacturing", acronym: "SM" }] };

// Minimal approval-sheet AOA for one course + one student, with cumulative TU.
function sheetAOA(spi, cpi, tu) {
  return [
    ["S. No", "Roll No", "Name", "CS4001", null, "SPI", "CPI", "SU", "TU", "SP", "TP", "WARNING"],
    ["", "", "", "Capstone", null, null, null, null, null, null, null, null],
    ["", "", "", 20, null, null, null, null, null, null, null, null],
    ["", "", "", "Grade", "Remarks", null, null, null, null, null, null, null],
    [1, "25BCS002", "AATISH KUMAR", "A", "-", spi, cpi, 20, tu, 0, 0, ""],
  ];
}

const wb = XLSX.utils.book_new();
for (let s = 1; s <= 8; s++) {
  const ws = XLSX.utils.aoa_to_sheet(sheetAOA(8 + s * 0.1, 8.2, 20 * s));
  XLSX.utils.book_append_sheet(wb, ws, `Sem${s}`);
}
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetAOA(7.5, 8.2, 45)), "Summer1");
const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

// Simulate a browser File: name + arrayBuffer().
const file = { name: "BTech_SM_2021_2021-22.xlsx", arrayBuffer: async () => buf };

const errors = [];
const assert = (c, m) => { if (!c) errors.push("FAIL: " + m); };

const units = await loadAllUnits([file], config);
assert(units.length === 9, `8 regular + 1 summer tab → 9 units (got ${units.length})`);
assert(units[0].meta.programme === "B.Tech", "programme from filename");
assert(units[0].meta.disciplineAcronym === "SM", "discipline from filename");
const reg = units.filter((u) => !u.meta.semester.type.toLowerCase().includes("summer"));
const summer = units.filter((u) => u.meta.semester.type.toLowerCase().includes("summer"));
assert(reg.length === 8 && summer.length === 1, "8 regular + 1 summer parsed");
assert(reg[0].meta.semester.no === 1, "tab Sem1 → semester 1");
assert(reg[7].meta.semester.no === 8, "tab Sem8 → semester 8");
assert(summer[0].meta.semester.no === 2, `Summer1 tab → semester 2 (got ${summer[0].meta.semester.no})`);
assert(summer[0].meta.semester.label === "Summer 1", `Summer1 label (got ${summer[0].meta.semester.label})`);
assert(reg[0].meta.academicYear === "2021-22", `sem1 year 2021-22 (got ${reg[0].meta.academicYear})`);
assert(reg[7].meta.academicYear === "2024-25", `sem8 year 2024-25 (got ${reg[7].meta.academicYear})`);

const { target, historyByRoll, multi } = mergeSemesterSheets(units);
assert(multi === true, "multi true from one multi-tab workbook");
assert(target.meta.semester.no === 8, "target sem 8");
assert(historyByRoll["25BCS002"].length === 9, "history has 9 entries (incl. summer)");
const finalReg = historyByRoll["25BCS002"].filter((h) => !h.is_summer).pop();
assert(finalReg.cumulative_credits === 160, "final regular TU 160");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("MULTI-TAB TEST PASS — one workbook with per-semester tabs expands and merges.");

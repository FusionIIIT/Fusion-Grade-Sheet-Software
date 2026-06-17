// ─────────────────────────────────────────────────────────────────────────────
//  Approval-sheet parser.
//
//  Reverse of the portal's GenerateResultAPI (examination/api/views.py:1338-1553),
//  which writes the workbook this app consumes. Layout produced there:
//
//    Row 1 : "S. No" | "Roll No" | "Name" | <CourseCode(merged 2 cols)> ... | SPI | CPI | SU | TU | SP | TP | WARNING
//    Row 2 :                                <CourseName(merged 2 cols)> ...
//    Row 3 :                                <Credit   (merged 2 cols)> ...
//    Row 4 :                                "Grade" | "Remarks" (per course)
//    Row 5+: S.No | Roll No | Name | grade | remark | ... | spi | cpi | su | tu | sp | tp | warning
//
//  Course columns start at index 3 (col D) and occupy 2 columns each
//  (Grade, Remarks). The trailing SPI/CPI/... block marks where courses end.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { remarkToSymbol } from "./mappers.js";

const FIRST_COURSE_COL = 3; // column D (0-based)
const TRAILING_HEADERS = ["SPI", "CPI", "SU", "TU", "SP", "TP", "WARNING"];

const norm = (v) => String(v ?? "").trim();

/**
 * Parse an .xlsx / .csv approval sheet (as an ArrayBuffer) into student records.
 * Reads the FIRST worksheet. For a specific worksheet use parseWorksheet().
 * @returns {{ courses: {code,name,credit}[], students: object[] }}
 */
export function parseApprovalSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return parseWorksheet(ws);
}

/**
 * Parse a single SheetJS worksheet (one semester) into student records.
 * @returns {{ courses: {code,name,credit}[], students: object[] }}
 */
export function parseWorksheet(ws) {
  if (!ws) throw new Error("The file has no worksheet.");

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  if (rows.length < 5) throw new Error("Sheet does not look like an approval sheet (too few rows).");

  const row0 = rows[0] || []; // course code / trailing headers
  const row1 = rows[1] || []; // course name
  const row2 = rows[2] || []; // credit
  const row3 = rows[3] || []; // Grade / Remarks

  // Sanity-check the fixed header columns.
  const looksValid =
    /roll/i.test(norm(row0[1])) && /name/i.test(norm(row0[2]));
  if (!looksValid) {
    throw new Error(
      'Unexpected sheet format. Expected "Roll No" in column B and "Name" in column C of the first row.'
    );
  }

  // Where does the trailing SPI/CPI/... block begin? That's the end of courses.
  let spiCol = row0.findIndex((c) => norm(c).toUpperCase() === "SPI");
  if (spiCol < FIRST_COURSE_COL) {
    // Fallback: scan from the right for the first known trailing header.
    spiCol = row0.length;
    for (let c = row0.length - 1; c >= FIRST_COURSE_COL; c--) {
      if (TRAILING_HEADERS.includes(norm(row0[c]).toUpperCase())) spiCol = c;
      else if (spiCol !== row0.length) break;
    }
  }

  // Build the course column map (pairs of Grade/Remarks).
  const courses = [];
  for (let c = FIRST_COURSE_COL; c + 1 <= spiCol - 1; c += 2) {
    const code = norm(row0[c]);
    if (!code) continue; // skip stray empty pair
    courses.push({
      code,
      name: norm(row1[c]),
      credit: row2[c] != null ? norm(row2[c]) : "",
      gradeCol: c,
      remarkCol: c + 1,
    });
  }
  if (courses.length === 0) {
    throw new Error("No course columns found between column D and the SPI column.");
  }

  // Locate trailing metric columns by header text (robust to extra/missing ones).
  const colOf = (label) => {
    const idx = row0.findIndex((c) => norm(c).toUpperCase() === label);
    return idx >= FIRST_COURSE_COL ? idx : -1;
  };
  const cpiCol = colOf("CPI");
  const finalSpiCol = colOf("SPI");
  const suCol = colOf("SU"); // Semester Units (credits earned this semester)
  const tuCol = colOf("TU"); // Total Units = cumulative credits (drives graduation logic)

  const numOrNull = (v) => {
    const n = parseFloat(norm(v));
    return Number.isFinite(n) ? n : null;
  };

  // Data rows: row index 4 onward.
  const students = [];
  for (let r = 4; r < rows.length; r++) {
    const row = rows[r] || [];
    const rollNo = norm(row[1]);
    const name = norm(row[2]);
    if (!rollNo) continue; // skip blank trailing rows

    const studentCourses = [];
    for (const co of courses) {
      const grade = norm(row[co.gradeCol]);
      if (!grade || grade === "-") continue; // student not graded in this course
      const remark = norm(row[co.remarkCol]);
      studentCourses.push({
        coursecode: co.code,
        coursename: co.name,
        credits: co.credit,
        grade,
        special_symbol: remarkToSymbol(remark),
      });
    }

    students.push({
      rollNo,
      name,
      courses: studentCourses,
      spi: finalSpiCol >= 0 ? norm(row[finalSpiCol]) : "",
      cpi: cpiCol >= 0 ? norm(row[cpiCol]) : "",
      su: suCol >= 0 ? numOrNull(row[suCol]) : null,
      tu: tuCol >= 0 ? numOrNull(row[tuCol]) : null, // cumulative credits
    });
  }

  if (students.length === 0) throw new Error("No student rows found in the sheet.");

  return {
    courses: courses.map(({ code, name, credit }) => ({ code, name, credit })),
    students,
  };
}

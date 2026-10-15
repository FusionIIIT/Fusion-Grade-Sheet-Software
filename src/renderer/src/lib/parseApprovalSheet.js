// ─────────────────────────────────────────────────────────────────────────────
//  Approval-sheet parser.
//
//  Reverse of the portal's GenerateResultAPI (examination/api/views.py:1338-1553),
//  which writes the workbook this app consumes. Current layout (dynamic heading +
//  merged headers, added by "Add dynamic heading and merged headers to approval
//  sheet export"):
//
//    Row 1 : <dynamic heading, merged across the full width>
//    Row 2 : "S. No" | "Roll No" | "Name" | <subject no. (merged 2 cols)> ... | SPI | CPI | SU | TU | SP | TP | WARNING
//    Row 3 :                                <CourseCode (merged 2 cols)> ...
//    Row 4 :                                <CourseName (merged 2 cols)> ...
//    Row 5 :                                <Credit     (merged 2 cols)> ...
//    Row 6 :                                "Grade" | "Remarks" (per course)
//    Row 7+: S.No | Roll No | Name | grade | remark | ... | spi | cpi | su | tu | sp | tp | warning
//
//  "S. No" / "Roll No" / "Name" and the trailing SPI/CPI/.../WARNING columns are
//  merged vertically from row 2 down to row 6; SheetJS only keeps a value in the
//  top-left anchor cell of a merged range, so all of those labels read from row 2.
//
//  Older sheets (pre dynamic-heading) have no row 1 heading and no row 2 subject
//  numbering; their header block starts one row earlier:
//
//    Row 1 : "S. No" | "Roll No" | "Name" | <CourseCode(merged 2 cols)> ... | SPI | CPI | SU | TU | SP | TP | WARNING
//    Row 2 :                                <CourseName(merged 2 cols)> ...
//    Row 3 :                                <Credit   (merged 2 cols)> ...
//    Row 4 :                                "Grade" | "Remarks" (per course)
//    Row 5+: data
//
//  Both layouts are supported; the layout is auto-detected by checking where
//  "Roll No" / "Name" actually sit.
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

// Detect which header layout the sheet uses by locating the row where
// "Roll No" / "Name" actually sit, and derive the rest of the header rows
// (course code / name / credit / grade-remarks) and the first data row from it.
function detectLayout(rows) {
  const isRollNameRow = (row) => /roll/i.test(norm(row?.[1])) && /name/i.test(norm(row?.[2]));

  // Current layout: dynamic heading on row 1 (index 0), header block on row 2 (index 1).
  if (isRollNameRow(rows[1])) {
    return { headerRow: 1, codeRow: 2, nameRow: 3, creditRow: 4, gradeRow: 5, dataStart: 6 };
  }
  // Pre dynamic-heading layout: header block starts on row 1 (index 0).
  if (isRollNameRow(rows[0])) {
    return { headerRow: 0, codeRow: 0, nameRow: 1, creditRow: 2, gradeRow: 3, dataStart: 4 };
  }
  return null;
}

/**
 * Parse a single SheetJS worksheet (one semester) into student records.
 * @returns {{ courses: {code,name,credit}[], students: object[] }}
 */
export function parseWorksheet(ws, { allowNoCourses = false } = {}) {
  if (!ws) throw new Error("The file has no worksheet.");

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  if (rows.length < 5) throw new Error("Sheet does not look like an approval sheet (too few rows).");

  const layout = detectLayout(rows);
  if (!layout) {
    throw new Error(
      'Unexpected sheet format. Expected "Roll No" in column B and "Name" in column C of the header row.'
    );
  }
  const { headerRow, codeRow, nameRow, creditRow, dataStart } = layout;

  const headerRowValues = rows[headerRow] || []; // Roll No / Name / trailing SPI, CPI, ...
  const codeRowValues = rows[codeRow] || [];
  const nameRowValues = rows[nameRow] || [];
  const creditRowValues = rows[creditRow] || [];

  // Where does the trailing SPI/CPI/... block begin? That's the end of courses.
  let spiCol = headerRowValues.findIndex((c) => norm(c).toUpperCase() === "SPI");
  if (spiCol < FIRST_COURSE_COL) {
    // Fallback: scan from the right for the first known trailing header.
    spiCol = headerRowValues.length;
    for (let c = headerRowValues.length - 1; c >= FIRST_COURSE_COL; c--) {
      if (TRAILING_HEADERS.includes(norm(headerRowValues[c]).toUpperCase())) spiCol = c;
      else if (spiCol !== headerRowValues.length) break;
    }
  }

  // Build the course column map (pairs of Grade/Remarks).
  const courses = [];
  for (let c = FIRST_COURSE_COL; c + 1 <= spiCol - 1; c += 2) {
    const code = norm(codeRowValues[c]);
    if (!code) continue; // skip stray empty pair
    courses.push({
      code,
      name: norm(nameRowValues[c]),
      credit: creditRowValues[c] != null ? norm(creditRowValues[c]) : "",
      gradeCol: c,
      remarkCol: c + 1,
    });
  }
  if (courses.length === 0 && !allowNoCourses) {
    throw new Error("No course columns found between column D and the SPI column.");
  }

  // Locate trailing metric columns by header text (robust to extra/missing ones).
  const colOf = (label) => {
    const idx = headerRowValues.findIndex((c) => norm(c).toUpperCase() === label);
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

  // Data rows start right after the header block.
  const students = [];
  for (let r = dataStart; r < rows.length; r++) {
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

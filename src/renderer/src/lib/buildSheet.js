// Assemble the grade-sheet HTML for one parsed student + the chosen metadata.
import { buildPrintHTML, formatSemesterLabel } from "./gradeSheetTemplate.js";
import { programmeFullName } from "./mappers.js";

// "2025-26" → "2025-2026" (leaves an already-full "2025-2026" unchanged).
function fullAcademicYear(ay) {
  const m = String(ay || "").match(/^(\d{4})\s*-\s*(\d{2,4})$/);
  if (!m) return ay;
  const start = parseInt(m[1], 10);
  if (m[2].length === 4) return `${m[1]}-${m[2]}`;
  let end = Math.floor(start / 100) * 100 + parseInt(m[2], 10);
  if (end <= start) end += 100;
  return `${start}-${end}`;
}

/**
 * @param student   parsed row from parseApprovalSheet: { rollNo, name, courses[], spi, cpi }
 * @param metadata  { academicYear, programme, disciplineName, semester: {no, type, label} }
 */
export function buildStudentSheetHtml(student, metadata, semesterHistory = []) {
  const { academicYear, programme, disciplineName, semester } = metadata;

  const studentInfo = {
    name: student.name || "",
    rollNumber: student.rollNo || "",
    programme: programmeFullName(programme),
    discipline: disciplineName || "N/A",
    academicYear: academicYear ? fullAcademicYear(academicYear) : "N/A",
  };

  const semesterLabel = formatSemesterLabel(semester);
  const selectedIsSummer = !!(semester?.type && semester.type.toLowerCase().includes("summer"));

  return buildPrintHTML(
    studentInfo,
    student.courses,
    parseFloat(student.spi) || 0,
    parseFloat(student.cpi) || 0,
    semesterLabel,
    // Single sheet → [] → simple Result/SPI/CPI line.
    // Multiple sheets → per-semester history → portal-faithful grid + graduation line.
    Array.isArray(semesterHistory) ? semesterHistory : [],
    semester?.no || 1,
    selectedIsSummer
  );
}

export function safeFileName(rollNo) {
  const safe = String(rollNo || "grade_sheet").replace(/[^\w.-]/g, "_");
  return `${safe}_grade_sheet.pdf`;
}

// Build ONE document containing every student's sheet, each on its own page.
// This lets Export All render in a single printToPDF pass (fast) instead of one
// offscreen window per student. The per-student CSS is identical, so we take the
// <style> from the first sheet and concatenate each <body> inner inside a
// page-breaking wrapper.
export function buildCombinedSheetHtml(students, metadata, historyByRoll = {}) {
  if (!students.length) return "<!doctype html><html><body></body></html>";

  const histOf = (s) => historyByRoll[s.rollNo] || [];

  const first = buildStudentSheetHtml(students[0], metadata, histOf(students[0]));
  const styleMatch = first.match(/<style>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : "";

  const bodyInner = (html) => {
    const m = html.match(/<body>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  };

  const pages = students
    .map((s) => `<div class="gs-page">${bodyInner(buildStudentSheetHtml(s, metadata, histOf(s)))}</div>`)
    .join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${css}
.gs-page { break-after: page; page-break-after: always; }
.gs-page:last-child { break-after: auto; page-break-after: auto; }
</style>
</head><body>
${pages}
</body></html>`;
}

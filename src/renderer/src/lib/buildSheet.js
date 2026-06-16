// Assemble the grade-sheet HTML for one parsed student + the chosen metadata.
import { buildPrintHTML, formatSemesterLabel } from "./gradeSheetTemplate.js";
import { programmeFullName } from "./mappers.js";

/**
 * @param student   parsed row from parseApprovalSheet: { rollNo, name, courses[], spi, cpi }
 * @param metadata  { academicYear, programme, disciplineName, semester: {no, type, label} }
 */
export function buildStudentSheetHtml(student, metadata) {
  const { academicYear, programme, disciplineName, semester } = metadata;

  const studentInfo = {
    name: student.name || "",
    rollNumber: student.rollNo || "",
    programme: programmeFullName(programme),
    discipline: disciplineName || "N/A",
    academicYear: academicYear || "N/A",
  };

  const semesterLabel = formatSemesterLabel(semester);
  const selectedIsSummer = !!(semester?.type && semester.type.toLowerCase().includes("summer"));

  return buildPrintHTML(
    studentInfo,
    student.courses,
    parseFloat(student.spi) || 0,
    parseFloat(student.cpi) || 0,
    semesterLabel,
    [], // v1: single-semester sheet → simple Result/SPI/CPI line (no history grid)
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
export function buildCombinedSheetHtml(students, metadata) {
  if (!students.length) return "<!doctype html><html><body></body></html>";

  const first = buildStudentSheetHtml(students[0], metadata);
  const styleMatch = first.match(/<style>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : "";

  const bodyInner = (html) => {
    const m = html.match(/<body>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  };

  const pages = students
    .map((s) => `<div class="gs-page">${bodyInner(buildStudentSheetHtml(s, metadata))}</div>`)
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

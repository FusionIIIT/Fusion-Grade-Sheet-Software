// ─────────────────────────────────────────────────────────────────────────────
//  Turn an uploaded file into one or more "semester units": { meta, parsed }.
//
//  Two layouts are supported transparently:
//   • Single-tab workbook  → metadata comes entirely from the FILE NAME
//     (e.g. BTech_CSE_Sem3_2024-25.xlsx). One unit.
//   • Multi-tab workbook   → programme + discipline (+ batch year) from the FILE
//     NAME, and each TAB is a semester named "Sem1", "Semester 2", "Summer 1"…
//     Academic year per tab is derived from the batch year + semester.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { parseWorksheet } from "./parseApprovalSheet.js";
import { parseFilename, extractSemester, extractBatchYear, deriveAcademicYear } from "./parseFilename.js";

const metaFrom = (m, semester, academicYear) => ({
  programme: m.programme,
  disciplineName: m.disciplineName,
  disciplineAcronym: m.disciplineAcronym,
  semester: semester || m.semester,
  academicYear: academicYear || m.academicYear,
});

export async function loadUnitsFromFile(file, config) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const names = wb.SheetNames || [];
  const fileMeta = parseFilename(file.name, config.disciplines);

  // Which tabs actually look like a semester?
  const semTabs = names
    .map((n) => ({ name: n, sem: extractSemester(n) }))
    .filter((t) => t.sem);

  // ── Single-tab (or no recognizable semester tabs): filename drives everything ──
  if (names.length <= 1 || semTabs.length <= 1) {
    if (!fileMeta.ok) {
      throw new Error(
        `${file.name}: couldn't read ${fileMeta.missing.join(", ")} from the file name. ` +
          `Rename like  BTech_CSE_Sem3_2024-25.xlsx , or put each semester on its own tab (Sem1, Sem2, …).`
      );
    }
    return [{ meta: metaFrom(fileMeta), parsed: parseWorksheet(wb.Sheets[names[0]]) }];
  }

  // ── Multi-tab: one semester per tab ──
  if (!fileMeta.programme || !fileMeta.disciplineName) {
    throw new Error(
      `${file.name}: couldn't read Programme/Discipline from the file name. ` +
        `Name the workbook like  BTech_CSE_2021.xlsx  (tabs: Sem1, Sem2, …).`
    );
  }
  const batchYear = extractBatchYear(file.name);
  const units = semTabs.map(({ name, sem }) => {
    const academicYear = batchYear ? deriveAcademicYear(batchYear, sem.no) : fileMeta.academicYear || "N/A";
    return { meta: metaFrom(fileMeta, sem, academicYear), parsed: parseWorksheet(wb.Sheets[name]) };
  });
  return units;
}

// Load every uploaded file → a flat list of semester units.
export async function loadAllUnits(files, config) {
  const all = [];
  for (const f of files) {
    const units = await loadUnitsFromFile(f, config);
    all.push(...units);
  }
  return all;
}

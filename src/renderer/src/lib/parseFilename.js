// ─────────────────────────────────────────────────────────────────────────────
//  Extract Programme / Discipline / Semester / Academic Year from the file NAME.
//
//  Supported formats (case-insensitive, separators flexible):
//   • Compact convention:
//        BTech_CSE_Sem3_2024-25.xlsx
//        MTechAIML_CSE_Sem1_2025-26.xlsx
//        PhD_ECE_Sem2_2024-25.xlsx
//   • Portal native download name (batchLabel_semesterLabel):
//        "B.Tech - Computer Science and Engineering CSE 2025_Semester 1.xlsx"
//        "M.Tech AI & ML - ... ECE 2025_Semester 1.xlsx"
//
//  When the academic year is not given as YYYY-YY (native format only has the
//  batch admission year), it is derived: startYear = batchYear + floor((sem-1)/2).
// ─────────────────────────────────────────────────────────────────────────────

// Programme token (normalized to A-Z0-9, uppercase) → canonical programme name.
// Ordered longest-first so M.Tech variants win over plain "MTECH".
const PROGRAMME_KEYS = [
  ["MTECHAIML", "M.Tech AI & ML"],
  ["MTECHARTIFICIALINTELLIGENCE", "M.Tech AI & ML"],
  ["MTECHDATASCIENCE", "M.Tech Data Science"],
  ["MTECHDS", "M.Tech Data Science"],
  ["MTECHCOMMUNICATIONANDSIGNALPROCESSING", "M.Tech Communication and Signal Processing"],
  ["MTECHCSP", "M.Tech Communication and Signal Processing"],
  ["MTECHNANOELECTRONICSANDVLSIDESIGN", "M.Tech Nanoelectronics and VLSI Design"],
  ["MTECHVLSI", "M.Tech Nanoelectronics and VLSI Design"],
  ["MTECHNANO", "M.Tech Nanoelectronics and VLSI Design"],
  ["MTECHPOWERCONTROL", "M.Tech Power & Control"],
  ["MTECHPOWERANDCONTROL", "M.Tech Power & Control"],
  ["MTECHPC", "M.Tech Power & Control"],
  ["MTECHMANUFACTURINGANDAUTOMATION", "M.Tech Manufacturing and Automation"],
  ["MTECHMA", "M.Tech Manufacturing and Automation"],
  ["MTECHCADCAM", "M.Tech CAD/CAM"],
  ["MTECHDESIGN", "M.Tech Design"],
  ["MTECH", "M.Tech"],
  ["MDES", "M.Des"],
  ["BTECH", "B.Tech"],
  ["BDES", "B.Des"],
  ["PHD", "PhD"],
];

const stripExt = (n) => String(n || "").replace(/\.(xlsx|xlsm|xls|csv)$/i, "");
const alnum = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function matchProgramme(progPart) {
  const norm = alnum(progPart);
  for (const [key, name] of PROGRAMME_KEYS) {
    if (norm === key || norm.startsWith(key)) return name;
  }
  return null;
}

function matchDiscipline(base, disciplines) {
  const tokens = base.split(/[_\s\-]+/).map((t) => t.trim()).filter(Boolean);
  const normTokens = tokens.map(alnum); // punctuation-stripped, e.g. "Des." -> "DES"

  // 1) acronym token match, ignoring punctuation/case ("Des." == "DES").
  for (const d of disciplines) {
    const ac = alnum(d.acronym);
    if (ac && normTokens.includes(ac)) return d;
  }
  // 2) full discipline-name match (native format embeds the full name).
  const baseAlnum = alnum(base);
  for (const d of disciplines) {
    if (d.name && baseAlnum.includes(alnum(d.name))) return d;
  }
  // 3) Positional fallback for the compact convention
  //    <Programme>_<Discipline>_Sem<N>_<Year> : the discipline is the token
  //    immediately before the Sem/Summer token. Works for ANY code, even ones
  //    not yet listed in academicConfig.json.
  const semIdx = tokens.findIndex((t) => /^(sem|summer|s\d)/i.test(t));
  if (semIdx >= 2) {
    const tok = tokens[semIdx - 1];
    const ac = alnum(tok);
    // must look like a discipline code (has a letter, not a year)
    if (ac && /[A-Z]/.test(ac) && !/^\d{4}$/.test(tok)) {
      return { name: ac, acronym: ac, _unknown: true };
    }
  }
  return null;
}

export function deriveAcademicYear(batchYear, semNo) {
  const start = batchYear + Math.floor((Math.max(1, semNo) - 1) / 2);
  const end = String((start + 1) % 100).padStart(2, "0");
  return `${start}-${end}`;
}

// Extract a semester from a free string — used for workbook TAB names like
// "Sem1", "Semester 3", "Summer 1", "S5". For summer the portal numbers tabs
// 1..4 onto even semesters 2,4,6,8 (matching academicConfig semesters).
export function extractSemester(str) {
  const s = String(str || "");
  const isSummer = /summer/i.test(s);
  const m =
    s.match(/sem(?:ester)?[\s_-]*?(\d+)/i) ||
    s.match(/summer[\s_-]*?(\d+)/i) ||
    s.match(/(?:^|[_\s-])S(\d+)(?:$|[_\s-])/i);
  if (!m) return null;
  let no = parseInt(m[1], 10);
  if (isSummer && no <= 4) no = no * 2; // Summer 1 → semester 2, etc.
  if (!no) return null;
  const type = isSummer ? "Summer Semester" : no % 2 === 1 ? "Odd Semester" : "Even Semester";
  const label = isSummer ? `Summer ${Math.max(1, Math.floor(no / 2))}` : `Semester ${no}`;
  return { no, type, label };
}

// Pull a batch admission year (or the start year of a YYYY-YY range) from a name.
export function extractBatchYear(name) {
  const base = stripExt(name);
  const range = base.match(/(\d{4})\s*-\s*\d{2,4}/);
  if (range) return parseInt(range[1], 10);
  const y = base.match(/(?:^|[_\s-])(20\d{2})(?:$|[_\s-])/);
  return y ? parseInt(y[1], 10) : null;
}

/**
 * @param filename     the uploaded file's name
 * @param disciplines  config.disciplines: [{ name, acronym }]
 * @returns { ok, programme, disciplineName, disciplineAcronym, semester:{no,type,label}, academicYear, missing[] }
 */
export function parseFilename(filename, disciplines = []) {
  const base = stripExt(filename);
  const missing = [];

  // ── Programme ──
  const progPart = base.includes(" - ") ? base.split(" - ")[0] : base.split(/[_\s]/)[0];
  const programme = matchProgramme(progPart);
  if (!programme) missing.push("Programme");

  // ── Discipline ──
  const disc = matchDiscipline(base, disciplines);
  if (!disc) missing.push("Discipline");

  const sem = extractSemester(base);
  if (!sem) missing.push("Semester");
  const semNo = sem ? sem.no : null;

  let academicYear = null;
  const explicit = base.match(/(\d{4})\s*-\s*(\d{2,4})/);
  if (explicit) {
    const end2 = explicit[2].length === 4 ? explicit[2].slice(2) : explicit[2].padStart(2, "0");
    academicYear = `${explicit[1]}-${end2}`;
  } else if (semNo) {
    const by = extractBatchYear(base);
    if (by) academicYear = deriveAcademicYear(by, semNo);
  }
  if (!academicYear) missing.push("Academic Year");

  return {
    ok: missing.length === 0,
    missing,
    programme,
    disciplineName: disc ? disc.name : null,
    disciplineAcronym: disc ? disc.acronym : null,
    semester: sem || { no: null, type: null, label: null },
    academicYear,
  };
}

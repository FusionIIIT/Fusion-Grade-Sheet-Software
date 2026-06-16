// Validate parseFilename against the user's conventions + the portal native name.
import { parseFilename } from "../src/renderer/src/lib/parseFilename.js";

// Authoritative IIITDMJ disciplines — synced 1:1 with the live Fusion DB
// (programme_curriculum_discipline). Note Design's acronym is "Des.".
const disciplines = [
  { name: "Computer Science and Engineering", acronym: "CSE" },
  { name: "Electronics and Communication Engineering", acronym: "ECE" },
  { name: "Mechanical Engineering", acronym: "ME" },
  { name: "Smart Manufacturing", acronym: "SM" },
  { name: "Mechatronics", acronym: "MT" },
  { name: "Design", acronym: "Des." },
  { name: "Humanities - English", acronym: "English" },
  { name: "Natural Sciences-Mathematics", acronym: "Maths" },
  { name: "Natural Sciences-Physics", acronym: "Physics" },
];

const cases = [
  ["BTech_CSE_Sem3_2024-25.xlsx", { programme: "B.Tech", disciplineAcronym: "CSE", semNo: 3, year: "2024-25", type: "Odd Semester" }],
  ["MTechAIML_CSE_Sem1_2025-26.xlsx", { programme: "M.Tech AI & ML", disciplineAcronym: "CSE", semNo: 1, year: "2025-26", type: "Odd Semester" }],
  ["PhD_ECE_Sem2_2024-25.xlsx", { programme: "PhD", disciplineAcronym: "ECE", semNo: 2, year: "2024-25", type: "Even Semester" }],
  ["BDes_DES_Sem4_2023-24.csv", { programme: "B.Des", disciplineAcronym: "Des.", semNo: 4, year: "2023-24", type: "Even Semester" }],
  ["BDes_Des._Sem1_2025-26.xlsx", { programme: "B.Des", disciplineAcronym: "Des.", semNo: 1, year: "2025-26", type: "Odd Semester" }],
  ["MTech_XYZ_Sem2_2024-25.xlsx", { programme: "M.Tech", disciplineAcronym: "XYZ", semNo: 2, year: "2024-25", type: "Even Semester" }],
  ["MTech_MT_Sem1_2025-26.xlsx", { programme: "M.Tech", disciplineAcronym: "MT", semNo: 1, year: "2025-26", type: "Odd Semester" }],
  ["BTech_SM_Sem5_2022-23.xlsx", { programme: "B.Tech", disciplineAcronym: "SM", semNo: 5, year: "2022-23", type: "Odd Semester" }],
  ["B.Tech - Mechanical Engineering ME 2024_Semester 3.xlsx", { programme: "B.Tech", disciplineAcronym: "ME", semNo: 3, year: "2025-26", type: "Odd Semester" }],
  ["B.Tech - Computer Science and Engineering CSE 2025_Semester 1.xlsx", { programme: "B.Tech", disciplineAcronym: "CSE", semNo: 1, year: "2025-26", type: "Odd Semester" }],
  ["M.Tech AI & ML - Electronics and Communication Engineering ECE 2025_Semester 1.xlsx", { programme: "M.Tech AI & ML", disciplineAcronym: "ECE", semNo: 1, year: "2025-26", type: "Odd Semester" }],
];

let fails = 0;
for (const [name, exp] of cases) {
  const r = parseFilename(name, disciplines);
  const checks = {
    ok: r.ok === true,
    programme: r.programme === exp.programme,
    discipline: r.disciplineAcronym === exp.disciplineAcronym,
    semNo: r.semester.no === exp.semNo,
    semType: r.semester.type === exp.type,
    year: r.academicYear === exp.year,
  };
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) {
    fails++;
    console.error(`FAIL ${name}\n  failed: ${bad.join(", ")}\n  got:`, JSON.stringify(r));
  } else {
    console.log(`PASS ${name} → ${r.programme} / ${r.disciplineAcronym} / ${r.semester.label} / ${r.academicYear}`);
  }
}
if (fails) { console.error(`\n${fails} filename case(s) failed.`); process.exit(1); }
console.log("\nALL FILENAME CASES PASS");

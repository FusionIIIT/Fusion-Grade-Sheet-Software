import { useState } from "react";
import { Alert, Badge, FileInput, Group, Stack, Text, Title } from "@mantine/core";
import { IconFileSpreadsheet, IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { loadAllUnits } from "../lib/loadWorkbook";
import { programmeFullName } from "../lib/mappers";
import { mergeSemesterSheets, validateSameBatch } from "../lib/mergeSheets";

export default function Uploader({ config, onLoaded, onReset }) {
  const [files, setFiles] = useState([]);
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState(null);

  const handleFiles = async (fileList) => {
    const list = Array.isArray(fileList) ? fileList : fileList ? [fileList] : [];
    setFiles(list);
    setError(null);
    setDetected(null);
    onReset?.();
    if (list.length === 0) return;

    try {
      // 1) Expand every file into semester units (handles single-tab files AND
      //    multi-tab workbooks, or any mix).
      const items = await loadAllUnits(list, config);

      // 2) All units must be the same batch.
      const batchErr = validateSameBatch(items);
      if (batchErr) throw new Error(batchErr);

      // 3) Merge → target (latest) sheet + per-roll semester history.
      const { target, historyByRoll, semesters, multi } = mergeSemesterSheets(items);
      const m = target.meta;
      const metadata = {
        academicYear: m.academicYear,
        programme: m.programme,
        disciplineName: m.disciplineName,
        disciplineAcronym: m.disciplineAcronym,
        semester: m.semester,
      };

      setDetected({ metadata, semesters, multi, count: items.length });
      onLoaded(target.parsed, metadata, historyByRoll);

      showNotification({
        color: "green",
        title: multi ? `${items.length} sheets merged` : "Sheet loaded",
        message: multi
          ? `${target.parsed.students.length} students • generating ${m.semester.label} with full history`
          : `${target.parsed.students.length} students • ${target.parsed.courses.length} courses`,
      });
    } catch (err) {
      setError(err.message || String(err));
      showNotification({ color: "red", title: "Could not load", message: err.message || String(err), autoClose: 8000 });
    }
  };

  return (
    <div className="card">
      <Title order={3} mb={4}>
        Upload Approval Sheet
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        Details are read from the file name. Upload <b>one</b> sheet for a single semester. For the
        final-year grid, give all the batch&apos;s semesters either as <b>multiple files at once</b> or
        as <b>one workbook with a tab per semester</b> (tabs named Sem1, Sem2, … Summer1).
      </Text>

      <Stack gap="md">
        <FileInput
          multiple
          placeholder="Choose one or more .xlsx / .csv approval sheets"
          accept=".xlsx,.xls,.csv"
          leftSection={<IconFileSpreadsheet size={18} />}
          value={files}
          onChange={handleFiles}
          clearable
          size="md"
        />

        {detected && (
          <Group gap="xs">
            <Badge size="lg" variant="light" color="blue" leftSection={<IconCircleCheck size={14} />}>
              {programmeFullName(detected.metadata.programme)}
            </Badge>
            <Badge size="lg" variant="light" color="grape">
              {detected.metadata.disciplineName} ({detected.metadata.disciplineAcronym})
            </Badge>
            <Badge size="lg" variant="light" color="teal">
              {detected.metadata.semester.label}
            </Badge>
            <Badge size="lg" variant="light" color="orange">
              {detected.metadata.academicYear}
            </Badge>
            {detected.multi && (
              <Badge size="lg" variant="filled" color="indigo">
                {detected.count} semesters → full grid
              </Badge>
            )}
          </Group>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Check the file(s)">
            {error}
          </Alert>
        )}
      </Stack>
    </div>
  );
}

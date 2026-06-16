import { useState } from "react";
import { Alert, Badge, FileInput, Group, Stack, Text, Title } from "@mantine/core";
import { IconFileSpreadsheet, IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { parseApprovalSheet } from "../lib/parseApprovalSheet";
import { parseFilename } from "../lib/parseFilename";
import { programmeFullName } from "../lib/mappers";

export default function Uploader({ config, onLoaded, onReset }) {
  const [file, setFile] = useState(null);
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (f) => {
    setFile(f);
    setError(null);
    setDetected(null);
    onReset?.();
    if (!f) return;

    // 1) Extract metadata from the file NAME.
    const meta = parseFilename(f.name, config.disciplines);
    setDetected(meta);
    if (!meta.ok) {
      setError(
        `Couldn't read ${meta.missing.join(", ")} from the filename. ` +
          `Rename the file like  BTech_CSE_Sem3_2024-25.xlsx  (or MTechAIML_CSE_Sem1_2025-26.xlsx).`
      );
      return;
    }

    // 2) Parse the sheet contents and hand everything up.
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseApprovalSheet(buf);
      onLoaded(parsed, {
        academicYear: meta.academicYear,
        programme: meta.programme,
        disciplineName: meta.disciplineName,
        disciplineAcronym: meta.disciplineAcronym,
        semester: meta.semester,
      });
      showNotification({
        color: "green",
        title: "Sheet loaded",
        message: `${parsed.students.length} students • ${parsed.courses.length} courses`,
      });
    } catch (err) {
      setError(err.message || String(err));
      showNotification({ color: "red", title: "Could not read the sheet", message: err.message || String(err) });
    }
  };

  return (
    <div className="card">
      <Title order={3} mb={4}>
        Upload Approval Sheet
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        Programme, discipline, semester and academic year are read automatically from the file name.
      </Text>

      <Stack gap="md">
        <FileInput
          placeholder="Choose the .xlsx / .csv approval sheet"
          accept=".xlsx,.xls,.csv"
          leftSection={<IconFileSpreadsheet size={18} />}
          value={file}
          onChange={handleFile}
          clearable
          size="md"
        />

        {detected && detected.ok && (
          <Group gap="xs">
            <Badge size="lg" variant="light" color="blue" leftSection={<IconCircleCheck size={14} />}>
              {programmeFullName(detected.programme)}
            </Badge>
            <Badge size="lg" variant="light" color="grape">
              {detected.disciplineName} ({detected.disciplineAcronym})
            </Badge>
            <Badge size="lg" variant="light" color="teal">
              {detected.semester.label}
            </Badge>
            <Badge size="lg" variant="light" color="orange">
              {detected.academicYear}
            </Badge>
          </Group>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Check the file name">
            {error}
          </Alert>
        )}
      </Stack>
    </div>
  );
}

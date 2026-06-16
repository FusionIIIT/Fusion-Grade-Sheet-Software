import { useMemo, useState } from "react";
import { Badge, Button, Group, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { IconPrinter, IconDownload, IconEye, IconFileExport, IconSearch } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { buildStudentSheetHtml, buildCombinedSheetHtml, safeFileName } from "../lib/buildSheet";
import { computeSpi } from "../lib/gradeData";
import PreviewModal from "./PreviewModal";

export default function StudentTable({ parsed, metadata, historyByRoll = {} }) {
  const histOf = (s) => historyByRoll[s.rollNo] || [];
  const [busy, setBusy] = useState({});
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState({ open: false, html: "", title: "" });
  const [query, setQuery] = useState("");

  const allStudents = parsed.students;
  const programmeLabel = metadata.programme;

  // Search filters across roll number and name.
  const students = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(
      (s) =>
        (s.rollNo || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q)
    );
  }, [allStudents, query]);

  const setRowBusy = (roll, v) => setBusy((p) => ({ ...p, [roll]: v }));

  const handlePreview = (student) => {
    const html = buildStudentSheetHtml(student, metadata, histOf(student));
    setPreview({ open: true, html, title: `Preview — ${student.rollNo}` });
  };

  const handleDownload = async (student) => {
    setRowBusy(student.rollNo, "download");
    try {
      const html = buildStudentSheetHtml(student, metadata, histOf(student));
      const res = await window.api.savePdf(html, safeFileName(student.rollNo));
      if (res.ok)
        showNotification({ color: "green", title: "Saved", message: res.path });
    } catch (err) {
      showNotification({ color: "red", title: "Download failed", message: String(err) });
    } finally {
      setRowBusy(student.rollNo, null);
    }
  };

  const handlePrint = async (student) => {
    setRowBusy(student.rollNo, "print");
    try {
      const html = buildStudentSheetHtml(student, metadata, histOf(student));
      const res = await window.api.printPdf(html);
      if (!res.ok && res.reason)
        showNotification({ color: "yellow", title: "Print", message: res.reason });
    } catch (err) {
      showNotification({ color: "red", title: "Print failed", message: String(err) });
    } finally {
      setRowBusy(student.rollNo, null);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      // One combined document → a single fast render pass in the main process.
      const combinedHtml = buildCombinedSheetHtml(students, metadata, historyByRoll);
      const name = `grade_sheets_${metadata.disciplineAcronym || "all"}_sem${metadata.semester.no}.pdf`;
      const res = await window.api.exportAll(combinedHtml, students.length, name);
      if (res.ok)
        showNotification({
          color: "green",
          title: "Exported",
          message: `${res.count} grade sheets → ${res.path}`,
        });
    } catch (err) {
      showNotification({ color: "red", title: "Export failed", message: String(err) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Title order={4} style={{ whiteSpace: "nowrap" }}>
          Students ({students.length}
          {query.trim() && students.length !== allStudents.length ? ` / ${allStudents.length}` : ""})
        </Title>
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, justifyContent: "flex-end" }}>
          <TextInput
            placeholder="Search roll number or name…"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ width: 320, maxWidth: "50%" }}
          />
          <Button
            variant="light"
            color="teal"
            leftSection={<IconFileExport size={18} />}
            onClick={handleExportAll}
            loading={exporting}
          >
            Export {query.trim() ? `(${students.length})` : "All"}
          </Button>
        </Group>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Roll Number</Table.Th>
            <Table.Th>Programme</Table.Th>
            <Table.Th>Courses</Table.Th>
            <Table.Th>SPI / CPI</Table.Th>
            <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {students.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  No students match “{query}”.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {students.map((s) => {
            const recomputed = computeSpi(s.courses);
            const sheetSpi = (parseFloat(s.spi) || 0).toFixed(1);
            const mismatch = recomputed !== sheetSpi;
            return (
              <Table.Tr key={s.rollNo}>
                <Table.Td>
                  <Text fw={600}>{s.rollNo}</Text>
                  <Text size="xs" c="dimmed">
                    {s.name}
                  </Text>
                </Table.Td>
                <Table.Td>{programmeLabel}</Table.Td>
                <Table.Td>{s.courses.length}</Table.Td>
                <Table.Td>
                  <Group gap={6}>
                    <span>
                      {sheetSpi} / {(parseFloat(s.cpi) || 0).toFixed(1)}
                    </span>
                    {mismatch && (
                      <Tooltip
                        label={`Sheet SPI ${sheetSpi} differs from recomputed ${recomputed}`}
                      >
                        <Badge color="orange" size="xs" variant="light">
                          check
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<IconEye size={15} />}
                      onClick={() => handlePreview(s)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="xs"
                      leftSection={<IconPrinter size={15} />}
                      loading={busy[s.rollNo] === "print"}
                      onClick={() => handlePrint(s)}
                    >
                      Print
                    </Button>
                    <Button
                      size="xs"
                      color="teal"
                      variant="light"
                      leftSection={<IconDownload size={15} />}
                      loading={busy[s.rollNo] === "download"}
                      onClick={() => handleDownload(s)}
                    >
                      Download
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <PreviewModal
        opened={preview.open}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
        html={preview.html}
        title={preview.title}
      />
    </div>
  );
}

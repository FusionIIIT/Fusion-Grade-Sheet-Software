import { Modal } from "@mantine/core";

export default function PreviewModal({ opened, onClose, html, title }) {
  return (
    <Modal opened={opened} onClose={onClose} size="auto" title={title} centered>
      <div style={{ width: 640, maxWidth: "80vw" }}>
        <iframe
          title="grade-sheet-preview"
          srcDoc={html || ""}
          style={{
            width: 620,
            height: "70vh",
            border: "1px solid #ddd",
            background: "#fff",
          }}
        />
      </div>
    </Modal>
  );
}

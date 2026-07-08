import { useState } from "react";
import type { DocumentType } from "@/documents/types";
import { documents as registryDocuments } from "@/documents/registry";
import { TemplateCard } from "./TemplateCard";

/**
 * Illustrative-only document types. They communicate that the picker will hold
 * more kinds later; they are NOT selectable and nothing is built behind them.
 */
const COMING_SOON_TYPES = ["Cover letter"];

export function CreateGallery({
  documents = registryDocuments,
}: {
  documents?: DocumentType<unknown>[];
}) {
  const [selectedId, setSelectedId] = useState(documents[0]?.id);
  const selected = documents.find((d) => d.id === selectedId) ?? documents[0];

  return (
    <div className="gallery">
      <div className="picker-label">Document type</div>
      <div className="pills">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={`pill${doc.id === selected.id ? " active" : ""}`}
            onClick={() => setSelectedId(doc.id)}
          >
            {doc.name}
          </button>
        ))}
        {COMING_SOON_TYPES.map((label) => (
          <span key={label} className="pill soon" aria-disabled="true">
            {label} <span className="tag">Soon</span>
          </span>
        ))}
      </div>

      <p className="tmpl-label">
        <b>
          {selected.templates.length} template{selected.templates.length === 1 ? "" : "s"}
        </b>{" "}
        for {selected.name} — click to start building
      </p>
      <div className="tmpl-cards">
        {selected.templates.map((template) => (
          <TemplateCard
            key={template.id}
            docId={selected.id}
            template={template}
            data={selected.defaultData}
          />
        ))}
        <div className="tmpl-card-soon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>More templates coming</span>
        </div>
      </div>
    </div>
  );
}

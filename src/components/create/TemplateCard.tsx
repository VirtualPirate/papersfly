import { Suspense } from "react";
import type { Template } from "@/templates/types";
import { builderHref } from "@/lib/routing";

/**
 * One gallery card: a scaled-down LIVE render of the template (the same
 * component used in the builder, behind <Suspense> so its chunk stays split),
 * linking to the builder for this doc + template.
 */
export function TemplateCard({
  docId,
  template,
  data,
}: {
  docId: string;
  // Erased boundary: the gallery renders templates of any document type
  // (data is passed through as the matching defaultData — see `data as never`).
  template: Template<any>;
  data: unknown;
}) {
  const Preview = template.Preview;
  return (
    <a className="tmpl-card" href={builderHref(docId, template.id)}>
      <div className="tmpl-thumb">
        <div className="tmpl-thumb-scale">
          <Suspense fallback={<div className="tmpl-thumb-skeleton" aria-hidden="true" />}>
            {/* data is the document's defaultData; its shape matches the template. */}
            <Preview data={data as never} variant={template.variants.default} />
          </Suspense>
        </div>
      </div>
      <div className="tmpl-meta">
        <div>
          <h3 className="tmpl-name">{template.name}</h3>
          {template.description && <p className="tmpl-desc">{template.description}</p>}
        </div>
        <span className="tmpl-use">
          Use
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </div>
    </a>
  );
}

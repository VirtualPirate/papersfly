import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { PRISM_VARIANTS } from "../variants";
import "./prism.css";

/** First-letter monogram from the sender name (up to two words). */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function PrismPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: InvoiceData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (p: string) => fontStyleFor(fontOverrides, p);
  const t = computeTotals(data);
  const money = (n: number) => formatMoney(n, data.currency);
  const address = (lines: string[]) => lines.filter((l) => l.trim());
  const hasBalance = data.amountPaid !== 0;

  return (
    <div className="resume-page t-prism" style={themeCssVars(resolveVariant(variant, PRISM_VARIANTS.colors))}>
      <aside className="pr-rail">
        <div className="pr-mark">{monogram(data.from.name).toUpperCase()}</div>
        <div className="pr-from">
          <b>{data.from.name}</b>
          {data.from.line2 && <>{data.from.line2}<br /></>}
          <br />
          {address(data.from.address).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}
        </div>
        <div className="pr-spacer" />
        <div className="pr-invword" style={f("title")}>{(data.title || "Invoice").toUpperCase()}</div>
        <div className="pr-num">{data.number}</div>
      </aside>

      <section className="pr-body">
        <div className="pr-billrow">
          <div className="to">
            <div className="pr-k">Billed to</div>
            <b style={f("billTo.name")}>{data.billTo.name}</b>
            {data.billTo.line2 && <><br />{data.billTo.line2}</>}
            {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
          </div>
          <div className="pr-dates">
            <div className="pr-k">Issued</div>
            <div className="num">{data.issueDate}</div>
            <div className="pr-k pr-mt">Due{data.terms ? ` · ${data.terms}` : ""}</div>
            <div className="num">{data.dueDate}</div>
            {data.poNumber && <><div className="pr-k pr-mt">P.O.</div><div className="num">{data.poNumber}</div></>}
          </div>
        </div>

        <div className="pr-cols">
          <div>Description</div><div className="pr-r">Qty</div><div className="pr-r">Rate</div><div className="pr-r">Amount</div>
        </div>
        {data.items.map((it, i) => (
          <div className="pr-row" data-pdf-block key={it.id}>
            <div className="d">
              <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
              {it.detail && <span>{it.detail}</span>}
            </div>
            <div className="pr-r">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</div>
            <div className="pr-r">{money(it.rate)}</div>
            <div className="pr-r">{money(t.lineAmounts[i])}</div>
          </div>
        ))}

        <div className="pr-tot" data-pdf-block>
          <div className="pr-tr"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
          {t.discount > 0 && <div className="pr-tr"><span>{data.discountLabel}</span><span className="num">−{money(t.discount)}</span></div>}
          {t.taxes.map((tx) => <div className="pr-tr" key={tx.id}><span>{tx.label}</span><span className="num">{money(tx.amount)}</span></div>)}
          <div className="pr-tr sum"><span>Total</span><span className="num">{money(t.total)}</span></div>
          {hasBalance && <div className="pr-tr"><span>{data.amountPaidLabel}</span><span className="num">−{money(t.amountPaid)}</span></div>}
        </div>
        <div className="pr-chip" data-pdf-block>
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>

        {(address(data.paymentLines).length > 0 || data.notes) && (
          <div className="pr-foot" data-pdf-block>
            {address(data.paymentLines).length > 0 && (
              <div><div className="pr-k">{data.paymentLabel}</div>{address(data.paymentLines).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}</div>
            )}
            {data.notes && <div><div className="pr-k">Notes</div>{data.notes}</div>}
          </div>
        )}
      </section>
    </div>
  );
}

export default PrismPreview;

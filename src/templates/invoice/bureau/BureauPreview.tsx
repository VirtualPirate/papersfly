import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { BUREAU_VARIANTS } from "../variants";
import "./bureau.css";

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function BureauPreview({
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
    <div className="resume-page t-bureau" style={themeCssVars(resolveVariant(variant, BUREAU_VARIANTS.colors))}>
      <div className="bu-head">
        <div className="bu-logo">
          <div className="box">{monogram(data.from.name).toUpperCase()}</div>
          <div>
            <b style={f("from.name")}>{data.from.name}</b>
            <span>{[address(data.from.address)[0], data.from.detail].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        <div className="bu-doc">
          <div className="word" style={f("title")}>{(data.title || "Invoice").toUpperCase()}</div>
          <div className="no">{data.number}</div>
          <span className="bu-pill">{hasBalance ? "Balance due" : "Amount due"}</span>
        </div>
      </div>

      <div className="bu-grid">
        <div className="bu-cell who">
          <div className="bu-k">Bill to</div>
          <b className="an" style={f("billTo.name")}>{data.billTo.name}</b>
          {data.billTo.line2 && <><br />{data.billTo.line2}</>}
          {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
        </div>
        <div className="bu-cell">
          <div className="bu-k">Invoice details</div>
          <dl className="bu-dl">
            <dt>Issued</dt><dd>{data.issueDate}</dd>
            <dt>Due</dt><dd>{data.dueDate}</dd>
            {data.terms && <><dt>Terms</dt><dd>{data.terms}</dd></>}
            {data.poNumber && <><dt>P.O.</dt><dd>{data.poNumber}</dd></>}
          </dl>
        </div>
      </div>

      <table className="bu-table">
        <thead>
          <tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={it.id}>
              <td className="desc">
                <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
                {it.detail && <span>{it.detail}</span>}
              </td>
              <td className="r mono">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
              <td className="r mono">{money(it.rate)}</td>
              <td className="r mono">{money(t.lineAmounts[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bu-foot">
        {address(data.paymentLines).length > 0 ? (
          <div className="bu-pay">
            <div className="bu-k">{data.paymentLabel}</div>
            {address(data.paymentLines).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}
          </div>
        ) : <div />}
        <div className="bu-panel">
          <div className="r"><span>Subtotal</span><span className="mono">{money(t.subtotal)}</span></div>
          {t.discount > 0 && <div className="r"><span>{data.discountLabel}</span><span className="mono">−{money(t.discount)}</span></div>}
          {t.taxes.map((tx) => <div className="r" key={tx.id}><span>{tx.label}</span><span className="mono">{money(tx.amount)}</span></div>)}
          <div className="r sum"><span>Total</span><span className="mono">{money(t.total)}</span></div>
          {hasBalance && <div className="r"><span>{data.amountPaidLabel}</span><span className="mono">−{money(t.amountPaid)}</span></div>}
          <div className="r bal"><span className="l">{hasBalance ? "Balance due" : "Amount due"}</span><span className="mono">{money(t.balanceDue)}</span></div>
        </div>
      </div>

      {data.notes && <div className="bu-notes">{data.notes}</div>}
    </div>
  );
}

export default BureauPreview;

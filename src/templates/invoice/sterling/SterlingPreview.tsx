import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { STERLING_VARIANTS } from "../variants";
import "./sterling.css";

export function SterlingPreview({
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
    <div className="resume-page t-sterling" style={themeCssVars(resolveVariant(variant, STERLING_VARIANTS.colors))}>
      <div className="st-mast">
        <div className="st-rule-d" />
        <div className="st-name" style={f("from.name")}>{data.from.name}</div>
        <div className="st-tag">{[data.from.line2, address(data.from.address).slice(-2, -1)[0]].filter(Boolean).join(" · ")}</div>
        <div className="st-rule-d" />
        <div className="st-doc" style={f("title")}>{data.title || "Invoice"}</div>
      </div>

      <div className="st-info">
        <div className="who">
          <div className="sc">Billed to</div>
          <b className="an" style={f("billTo.name")}>{data.billTo.name}</b>
          {data.billTo.line2 && <><br />{data.billTo.line2}</>}
          {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
        </div>
        <div>
          <div className="sc">Particulars</div>
          <dl className="st-dl">
            <dt>Invoice No.</dt><dd>{data.number}</dd>
            <dt>Date issued</dt><dd>{data.issueDate}</dd>
            <dt>Due date</dt><dd>{data.dueDate}</dd>
            {data.terms && <><dt>Terms</dt><dd>{data.terms}</dd></>}
            {data.poNumber && <><dt>P.O. number</dt><dd>{data.poNumber}</dd></>}
          </dl>
        </div>
      </div>

      <table className="st-table">
        <thead>
          <tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr data-pdf-block key={it.id}>
              <td className="desc">
                <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
                {it.detail && <span>{it.detail}</span>}
              </td>
              <td className="r num">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
              <td className="r num">{money(it.rate)}</td>
              <td className="r num">{money(t.lineAmounts[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="st-totals" data-pdf-block>
        <div className="st-trow"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
        {t.discount > 0 && <div className="st-trow"><span>{data.discountLabel}</span><span className="num">−{money(t.discount)}</span></div>}
        {t.taxes.map((tx) => <div className="st-trow" key={tx.id}><span>{tx.label}</span><span className="num">{money(tx.amount)}</span></div>)}
        <div className="st-trow total"><span>Total</span><span className="num">{money(t.total)}</span></div>
        {hasBalance && <div className="st-trow"><span>{data.amountPaidLabel}</span><span className="num">−{money(t.amountPaid)}</span></div>}
        <div className="st-balance">
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>
      </div>

      {(address(data.paymentLines).length > 0 || data.notes) && (
        <div className="st-foot" data-pdf-block>
          <div className="st-rule-thin" />
          {address(data.paymentLines).length > 0 && <div>{data.paymentLabel}: {address(data.paymentLines).join(" · ")}</div>}
          {data.notes && <div>{data.notes}</div>}
        </div>
      )}
    </div>
  );
}

export default SterlingPreview;

import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { NORDIC_VARIANTS } from "../variants";
import "./nordic.css";

export function NordicPreview({
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
    <div className="resume-page t-nordic" style={themeCssVars(resolveVariant(variant, NORDIC_VARIANTS.colors))}>
      <div className="nd-topbar" />
      <header className="nd-head">
        <div className="nd-title" style={f("title")}>{data.title || "Invoice"}</div>
        <div className="nd-from">
          <b style={f("from.name")}>{data.from.name}</b>
          {data.from.line2 && <div className="nd-tag">{data.from.line2}</div>}
          {address(data.from.address).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </header>

      <div className="nd-meta">
        <div>
          <div className="nd-lbl">Billed to</div>
          <div className="nd-val">
            <b style={f("billTo.name")}>{data.billTo.name}</b>
            {data.billTo.line2 && <><br />{data.billTo.line2}</>}
            {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
          </div>
        </div>
        <div>
          <div className="nd-lbl">Invoice no.</div>
          <div className="nd-val">{data.number}</div>
          {data.poNumber && <><div className="nd-lbl nd-mt">P.O.</div><div className="nd-val">{data.poNumber}</div></>}
        </div>
        <div>
          <div className="nd-lbl">Issued</div>
          <div className="nd-val">{data.issueDate}</div>
          {data.terms && <><div className="nd-lbl nd-mt">Terms</div><div className="nd-val">{data.terms}</div></>}
        </div>
        <div>
          <div className="nd-lbl">Due</div>
          <div className="nd-val">{data.dueDate}</div>
        </div>
      </div>

      <div className="nd-items">
        <div className="nd-cols">
          <div>Description</div><div className="nd-r">Qty</div><div className="nd-r">Rate</div><div className="nd-r">Amount</div>
        </div>
        {data.items.map((it, i) => (
          <div className="nd-row" key={it.id}>
            <div className="nd-desc">
              <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
              {it.detail && <span>{it.detail}</span>}
            </div>
            <div className="nd-r">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</div>
            <div className="nd-r">{money(it.rate)}</div>
            <div className="nd-r">{money(t.lineAmounts[i])}</div>
          </div>
        ))}
      </div>

      <div className="nd-totals">
        <div className="nd-tr"><span>Subtotal</span><b>{money(t.subtotal)}</b></div>
        {t.discount > 0 && <div className="nd-tr"><span>{data.discountLabel}</span><b>−{money(t.discount)}</b></div>}
        {t.taxes.map((tx) => <div className="nd-tr" key={tx.id}><span>{tx.label}</span><b>{money(tx.amount)}</b></div>)}
        <div className="nd-tr strong"><span>Total</span><b>{money(t.total)}</b></div>
        {hasBalance && <div className="nd-tr"><span>{data.amountPaidLabel}</span><b>−{money(t.amountPaid)}</b></div>}
      </div>
      <div className="nd-totals nd-balance-wrap">
        <div className="nd-balance">
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>
      </div>

      {(address(data.paymentLines).length > 0 || data.notes) && (
        <div className="nd-foot">
          {address(data.paymentLines).length > 0 && (
            <div className="nd-foot-col">
              <div className="nd-lbl">{data.paymentLabel}</div>
              {address(data.paymentLines).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          {data.notes && (
            <div className="nd-foot-col"><div className="nd-lbl">Notes</div>{data.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default NordicPreview;

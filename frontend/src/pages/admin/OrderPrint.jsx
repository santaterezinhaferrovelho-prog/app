import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { formatBRL } from "@/lib/api";
import { STATUS_META } from "./statusMeta";

// Layout for 80mm thermal printers.
// Auto-triggers window.print() once loaded.
export default function OrderPrint() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/admin/orders/${id}`);
        if (!cancelled) setData(data);
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.detail || "Falha ao carregar pedido");
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!data) return;
    // Give the browser a tick to render, then open the print dialog
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [data]);

  if (err) return <div className="p-6 text-rose-500">{err}</div>;
  if (!data) return <div className="p-6 text-zinc-500">Preparando comanda…</div>;

  const { order, lojista } = data;
  const meta = STATUS_META[order.status] || STATUS_META.new;
  const dt = new Date(order.created_at);
  const pay = { pix: "PIX", cash: "DINHEIRO", card: "CARTÃO" }[order.payment_method] || order.payment_method;

  return (
    <>
      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        html, body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
        .receipt { width: 72mm; margin: 0 auto; padding: 2mm; font-family: 'Courier New', ui-monospace, monospace; font-size: 12px; color: #000; line-height: 1.35; }
        .receipt h1 { font-size: 18px; font-weight: 800; margin: 0 0 2mm; text-align: center; letter-spacing: 0.5px; }
        .receipt h2 { font-size: 13px; font-weight: 700; margin: 3mm 0 1mm; }
        .receipt .center { text-align: center; }
        .receipt .row { display: flex; justify-content: space-between; gap: 6px; }
        .receipt hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .receipt .big { font-size: 15px; font-weight: 800; }
        .receipt .item { margin: 1mm 0; }
        .receipt .item .name { font-weight: 700; }
        .receipt .muted { font-size: 11px; }
        .receipt .stamp { border: 1.5px solid #000; padding: 1.5mm 3mm; display: inline-block; font-weight: 800; letter-spacing: 1px; margin: 2mm 0; }
        @media screen {
          body { background: #f5f5f5 !important; padding: 20px 0; }
          .receipt { background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          .no-print { text-align: center; margin: 12px 0; }
          .no-print button { background: #FF5500; color: #fff; border: 0; padding: 8px 18px; border-radius: 8px; font-family: system-ui, sans-serif; font-weight: 600; cursor: pointer; }
        }
        @media print { .no-print { display: none; } }
      `}</style>

      <div className="no-print">
        <button onClick={() => window.print()} data-testid="print-again-btn">Imprimir novamente</button>
      </div>

      <div className="receipt">
        <h1>{lojista.name}</h1>
        {lojista.address && <div className="center muted">{lojista.address}</div>}
        {(lojista.phone || lojista.whatsapp) && (
          <div className="center muted">Tel: {lojista.whatsapp || lojista.phone}</div>
        )}
        <hr />

        <div className="row"><span>PEDIDO</span><span className="big">#{order.order_number}</span></div>
        <div className="row muted"><span>Data</span><span>{dt.toLocaleString("pt-BR")}</span></div>
        <div className="row muted"><span>Status</span><span>{meta.label.toUpperCase()}</span></div>
        <div className="row muted"><span>Tipo</span><span>{order.order_type === "delivery" ? "DELIVERY" : "RETIRADA"}</span></div>

        <hr />

        <h2>CLIENTE</h2>
        <div>{order.customer_name}</div>
        <div className="muted">Tel: {order.customer_phone}</div>
        {order.order_type === "delivery" && (
          <div className="muted">
            {order.address}, {order.number}{order.complement ? ` - ${order.complement}` : ""}<br />
            {order.neighborhood}
          </div>
        )}

        <hr />
        <h2>ITENS</h2>
        {order.items?.map((it, i) => {
          const addonsSum = (it.addons || []).reduce((s, a) => s + a.price, 0);
          const line = (it.unit_price + addonsSum) * it.quantity;
          return (
            <div className="item" key={i}>
              <div className="row">
                <span className="name">{it.quantity}x {it.product_name}{it.size_name ? ` (${it.size_name})` : ""}</span>
                <span>{formatBRL(line)}</span>
              </div>
              {it.addons?.length > 0 && (
                <div className="muted">+ {it.addons.map((a) => a.name).join(", ")}</div>
              )}
              {it.observation && <div className="muted">Obs.: {it.observation}</div>}
            </div>
          );
        })}

        <hr />
        <div className="row"><span>Subtotal</span><span>{formatBRL(order.subtotal)}</span></div>
        {order.delivery_fee > 0 && (
          <div className="row"><span>Entrega</span><span>{formatBRL(order.delivery_fee)}</span></div>
        )}
        <div className="row big"><span>TOTAL</span><span>{formatBRL(order.total)}</span></div>

        <hr />
        <div className="row"><span>Pagamento</span><span>{pay}</span></div>
        {order.payment_method === "cash" && order.change_for && (
          <div className="row muted"><span>Troco para</span><span>{formatBRL(order.change_for)}</span></div>
        )}
        {order.notes && (<>
          <hr />
          <div className="muted"><b>Observações:</b> {order.notes}</div>
        </>)}

        <div className="center" style={{ marginTop: "4mm" }}>
          <div className="stamp">OBRIGADO!</div>
        </div>
        <div className="center muted" style={{ marginTop: "3mm" }}>
          /{lojista.slug}
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import api, { formatBRL } from "@/lib/api";
import { STATUS_META, STATUS_FLOW } from "./statusMeta";
import { toast } from "sonner";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await api.get("/admin/orders");
    setOrders(data);
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const setStatus = async (o, status) => {
    try {
      await api.patch(`/admin/orders/${o.id}/status`, { status });
      toast.success(`Status atualizado: ${STATUS_META[status].label}`);
      load();
    } catch (e) {
      toast.error("Falha ao atualizar status");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Pedidos</h1>
      <p className="text-zinc-400 text-sm mt-1">Gerencie os pedidos do seu estabelecimento.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {["all", ...STATUS_FLOW, "cancelled"].map((s) => (
          <button
            key={s} onClick={() => setFilter(s)}
            data-testid={`orders-filter-${s}`}
            className={`text-xs whitespace-nowrap rounded-full px-3 py-1.5 border ${filter === s ? "bg-[#FF5500] border-[#FF5500] text-white" : "bg-[#1A1A1E] border-white/10 text-zinc-300"}`}
          >
            {s === "all" ? "Todos" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 && <div className="text-zinc-500 text-sm py-10 text-center">Sem pedidos.</div>}
        {filtered.map((o) => {
          const meta = STATUS_META[o.status] || STATUS_META.new;
          const nextIdx = STATUS_FLOW.indexOf(o.status);
          const next = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
          return (
            <div key={o.id} data-testid={`order-card-${o.id}`} className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">Pedido #{o.order_number} · {o.customer_name}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(o.created_at).toLocaleString("pt-BR")} · {o.order_type === "delivery" ? "Delivery" : "Retirada"} · {o.payment_method}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${meta.pill}`}>{meta.label}</span>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                {o.items?.map((it, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-zinc-300">{it.quantity}× {it.product_name}{it.size_name ? ` (${it.size_name})` : ""}</span>
                    <span className="font-mono text-zinc-400">{formatBRL(it.unit_price * it.quantity)}</span>
                  </div>
                ))}
              </div>
              {o.order_type === "delivery" && (
                <div className="mt-2 text-xs text-zinc-500">
                  Entrega: {o.address}, {o.number} {o.complement && `— ${o.complement}`} · {o.neighborhood}
                </div>
              )}
              <div className="mt-2 text-xs text-zinc-500">Telefone: {o.customer_phone}</div>
              {o.notes && <div className="mt-1 text-xs italic text-zinc-500">Obs.: {o.notes}</div>}

              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <div className="font-mono text-orange-400 font-bold">Total: {formatBRL(o.total)}</div>
                <div className="flex gap-2">
                  {next && o.status !== "cancelled" && (
                    <button
                      onClick={() => setStatus(o, next)}
                      data-testid={`order-advance-${o.id}`}
                      className="rounded-lg bg-[#FF5500] hover:bg-[#FF6B1A] text-white text-xs font-semibold px-3 py-1.5"
                    >
                      Avançar → {STATUS_META[next].label}
                    </button>
                  )}
                  {!["delivered", "cancelled"].includes(o.status) && (
                    <button
                      onClick={() => setStatus(o, "cancelled")}
                      data-testid={`order-cancel-${o.id}`}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs px-3 py-1.5 hover:bg-rose-500/20"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

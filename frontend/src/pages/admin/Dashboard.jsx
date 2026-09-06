import { useEffect, useState } from "react";
import api, { formatBRL } from "@/lib/api";
import { ShoppingBag, TrendingUp, Clock, Package } from "lucide-react";
import { STATUS_META } from "./statusMeta";

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/dashboard").then((r) => setData(r.data)); }, []);
  if (!data) return <div className="text-zinc-500">Carregando…</div>;

  const kpis = [
    { icon: ShoppingBag, label: "Pedidos hoje", value: data.orders_today, testid: "kpi-orders-today" },
    { icon: TrendingUp, label: "Vendas hoje", value: formatBRL(data.sales_today), testid: "kpi-sales-today" },
    { icon: Clock, label: "Pendentes", value: data.pending_orders, testid: "kpi-pending" },
    { icon: Package, label: "Produtos ativos", value: data.active_products, testid: "kpi-active-products" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
      <p className="text-zinc-400 text-sm mt-1">Visão geral do seu estabelecimento.</p>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} data-testid={k.testid} className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5">
            <k.icon className="h-5 w-5 text-[#FF5500]" />
            <div className="mt-3 text-2xl font-display font-bold">{k.value}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl font-bold mt-10 mb-3">Pedidos recentes</h2>
      <div className="space-y-2">
        {data.recent_orders?.length === 0 && (
          <div className="text-zinc-500 text-sm">Nenhum pedido ainda.</div>
        )}
        {data.recent_orders?.map((o) => {
          const meta = STATUS_META[o.status] || STATUS_META.new;
          return (
            <div key={o.id} className="rounded-xl border border-white/8 bg-[#1A1A1E] p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Pedido #{o.order_number} · {o.customer_name}</div>
                <div className="text-xs text-zinc-500">{o.items?.length} itens · {formatBRL(o.total)}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${meta.pill}`}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import api, { formatBRL } from "@/lib/api";
import { STATUS_META, STATUS_FLOW } from "./statusMeta";
import { toast } from "sonner";
import { Bell, BellOff, Volume2, Printer } from "lucide-react";
import { playNewOrderChime, unlockAudio } from "@/lib/sound";

const SEEN_KEY = "orders_seen_ids";
const PRINT_WIN_FEATURES = "width=420,height=720,scrollbars=yes,resizable=yes";

function openPrintWindow(orderId) {
  window.open(`/admin/orders/${orderId}/print`, `print_${orderId}`, PRINT_WIN_FEATURES);
}

function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-500)));
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("orders_sound_on") === "1");
  const [flashIds, setFlashIds] = useState(new Set());
  const seenRef = useRef(loadSeen());
  const firstLoadRef = useRef(true);

  const load = async () => {
    let data;
    try {
      const res = await api.get("/admin/orders");
      data = res.data;
    } catch { return; }
    // Detect newly arrived NEW orders
    const seen = seenRef.current;
    const arrived = data.filter((o) => o.status === "new" && !seen.has(o.id));

    if (arrived.length > 0 && !firstLoadRef.current) {
      if (soundOn) playNewOrderChime();
      const first = arrived[0];
      toast.success(`Novo pedido #${first.order_number} · ${first.customer_name}`, {
        description: `${first.items?.length || 0} itens · ${formatBRL(first.total)}`,
      });
      setFlashIds((prev) => {
        const s = new Set(prev);
        arrived.forEach((o) => s.add(o.id));
        return s;
      });
      // Clear flash after 20s
      setTimeout(() => {
        setFlashIds((prev) => {
          const s = new Set(prev);
          arrived.forEach((o) => s.delete(o.id));
          return s;
        });
      }, 20000);
    }
    // Mark everything as seen so we don't re-alert on refresh
    data.forEach((o) => seen.add(o.id));
    saveSeen(seen);
    firstLoadRef.current = false;
    setOrders(data);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  const toggleSound = () => {
    const next = !soundOn;
    if (next) {
      unlockAudio();
      playNewOrderChime(); // preview so user knows it works
    }
    setSoundOn(next);
    localStorage.setItem("orders_sound_on", next ? "1" : "0");
    toast(next ? "Aviso sonoro ativado" : "Aviso sonoro desativado");
  };

  const testSound = () => {
    unlockAudio();
    playNewOrderChime();
  };

  const setStatus = async (o, status) => {
    try {
      await api.patch(`/admin/orders/${o.id}/status`, { status });
      toast.success(`Status atualizado: ${STATUS_META[status].label}`);
      // Auto-print when moving into "accepted"
      if (status === "accepted") {
        openPrintWindow(o.id);
      }
      // Clear the visual flash for this order
      setFlashIds((prev) => {
        const s = new Set(prev); s.delete(o.id); return s;
      });
      load();
    } catch {
      toast.error("Falha ao atualizar status");
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            Pedidos
            {newCount > 0 && (
              <span data-testid="new-orders-badge" className="ml-1 text-xs font-mono rounded-full bg-[#FF5500] text-white px-2 py-0.5">
                {newCount} novo{newCount > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie os pedidos do seu estabelecimento.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            data-testid="sound-toggle-btn"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border transition-all ${
              soundOn
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                : "bg-[#1A1A1E] text-zinc-300 border-white/10 hover:bg-white/5"
            }`}
          >
            {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {soundOn ? "Aviso sonoro ON" : "Aviso sonoro OFF"}
          </button>
          <button
            onClick={testSound}
            data-testid="sound-test-btn"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-300 border border-white/10 hover:bg-white/5"
            title="Tocar som de teste"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </div>

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
          const isFlashing = flashIds.has(o.id) && o.status === "new";
          return (
            <div
              key={o.id}
              data-testid={`order-card-${o.id}`}
              className={`relative rounded-2xl border bg-[#1A1A1E] p-4 transition-all ${
                isFlashing
                  ? "border-[#FF5500] shadow-[0_0_0_2px_rgba(255,85,0,0.35),0_20px_50px_-12px_rgba(255,85,0,0.5)] animate-pulse"
                  : "border-white/8"
              }`}
            >
              {isFlashing && (
                <div className="absolute -top-2 left-4 text-[10px] font-bold uppercase tracking-widest bg-[#FF5500] text-white px-2 py-0.5 rounded-full">
                  NOVO PEDIDO
                </div>
              )}
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
                  <button
                    onClick={() => openPrintWindow(o.id)}
                    data-testid={`order-print-${o.id}`}
                    title="Imprimir comanda"
                    className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
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

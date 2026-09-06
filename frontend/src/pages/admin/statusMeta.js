export const STATUS_META = {
  new:               { label: "Novo",           pill: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  accepted:          { label: "Aceito",         pill: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  preparing:         { label: "Em preparação",  pill: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  ready:             { label: "Pronto",         pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  out_for_delivery:  { label: "Saiu p/ entrega",pill: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  delivered:         { label: "Entregue",       pill: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  cancelled:         { label: "Cancelado",      pill: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

export const STATUS_FLOW = ["new", "accepted", "preparing", "ready", "out_for_delivery", "delivered"];

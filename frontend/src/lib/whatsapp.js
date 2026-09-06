// Build a WhatsApp deep-link with a pre-composed message to the lojista
// containing the full order summary. Auto-prefixes country code 55 (BR)
// when the number has 10 or 11 digits (no country code).

function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function normalizeWhatsAppNumber(raw) {
  const n = (raw || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.length === 10 || n.length === 11) return `55${n}`;
  return n;
}

export function buildOrderMessage(order, lojista) {
  const lines = [];
  lines.push(`🛎️ *Novo pedido #${order.order_number}* — ${lojista?.name || ""}`);
  lines.push("");
  lines.push(`*Cliente:* ${order.customer_name}`);
  lines.push(`*Telefone:* ${order.customer_phone}`);
  lines.push(`*Tipo:* ${order.order_type === "delivery" ? "Delivery" : "Retirada"}`);
  if (order.order_type === "delivery") {
    const addr = [
      `${order.address}${order.number ? `, ${order.number}` : ""}`,
      order.complement,
      order.neighborhood,
    ].filter(Boolean).join(" — ");
    lines.push(`*Endereço:* ${addr}`);
  }
  lines.push("");
  lines.push("*Itens:*");
  (order.items || []).forEach((it) => {
    const addonsSum = (it.addons || []).reduce((s, a) => s + a.price, 0);
    const line = (it.unit_price + addonsSum) * it.quantity;
    let s = `• ${it.quantity}× ${it.product_name}`;
    if (it.size_name) s += ` (${it.size_name})`;
    s += ` — ${formatBRL(line)}`;
    lines.push(s);
    if (it.addons?.length) lines.push(`   + ${it.addons.map((a) => a.name).join(", ")}`);
    if (it.observation) lines.push(`   _Obs.: ${it.observation}_`);
  });
  lines.push("");
  lines.push(`*Subtotal:* ${formatBRL(order.subtotal)}`);
  if (order.delivery_fee > 0) lines.push(`*Entrega:* ${formatBRL(order.delivery_fee)}`);
  lines.push(`*TOTAL:* ${formatBRL(order.total)}`);
  lines.push("");
  const payMap = { pix: "Pix", cash: "Dinheiro", card: "Cartão" };
  lines.push(`*Pagamento:* ${payMap[order.payment_method] || order.payment_method}`);
  if (order.payment_method === "cash" && order.change_for) {
    lines.push(`*Troco para:* ${formatBRL(order.change_for)}`);
  }
  if (order.notes) {
    lines.push("");
    lines.push(`_Obs. do pedido:_ ${order.notes}`);
  }
  return lines.join("\n");
}

export function buildWhatsAppLink(order, lojista) {
  const num = normalizeWhatsAppNumber(lojista?.whatsapp);
  if (!num) return null;
  const msg = encodeURIComponent(buildOrderMessage(order, lojista));
  return `https://wa.me/${num}?text=${msg}`;
}

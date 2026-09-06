import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CartProvider, useCart } from "@/context/CartContext";
import api, { formatBRL } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

function CheckoutInner({ slug, lojista }) {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState("delivery");
  const [payment, setPayment] = useState("pix");
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "",
    address: "", number: "", complement: "", neighborhood: "",
    notes: "", change_for: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = orderType === "delivery" ? (lojista.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (items.length === 0) navigate(`/${slug}`, { replace: true });
  }, [items, slug, navigate]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    if (orderType === "delivery" && (!form.address || !form.number || !form.neighborhood)) {
      toast.error("Preencha o endereço de entrega.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        order_type: orderType,
        address: form.address,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        payment_method: payment,
        change_for: payment === "cash" && form.change_for ? Number(form.change_for) : null,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          size_name: it.size_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          addons: it.addons || [],
          observation: it.observation || "",
        })),
        subtotal, delivery_fee: deliveryFee, total,
        notes: form.notes,
      };
      const { data } = await api.post(`/public/lojistas/${slug}/orders`, body);
      clear();
      navigate(`/${slug}/success/${data.id}`, { state: { order: data, lojista } });
    } catch (e) {
      toast.error("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 pb-10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to={`/${slug}`} className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm mb-4">
          <ChevronLeft className="h-4 w-4" />
          Voltar ao cardápio
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Finalizar pedido</h1>
        <p className="text-zinc-400 text-sm mt-1">Confirme seus dados para enviar o pedido.</p>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Seus dados</div>
            <div>
              <Label className="text-zinc-300">Nome</Label>
              <Input data-testid="checkout-name-input" value={form.customer_name} onChange={set("customer_name")} className="bg-[#0D0D0F] border-white/10 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-300">Telefone / WhatsApp</Label>
              <Input data-testid="checkout-phone-input" value={form.customer_phone} onChange={set("customer_phone")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="(11) 90000-0000" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5 space-y-4">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Tipo de pedido</div>
            <RadioGroup value={orderType} onValueChange={setOrderType} className="grid grid-cols-2 gap-2">
              {[["delivery", "Delivery"], ["pickup", "Retirada"]].map(([v, l]) => (
                <label key={v} className={`cursor-pointer rounded-xl border px-4 py-3 flex items-center gap-2 ${orderType === v ? "border-[#FF5500] bg-[#FF5500]/10" : "border-white/10 bg-[#0D0D0F]"}`}>
                  <RadioGroupItem value={v} data-testid={`checkout-ordertype-${v}`} className="border-white/40" />
                  <span className="text-sm font-medium">{l}</span>
                </label>
              ))}
            </RadioGroup>

            {orderType === "delivery" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-zinc-300">Endereço</Label>
                  <Input data-testid="checkout-address-input" value={form.address} onChange={set("address")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-300">Número</Label>
                  <Input data-testid="checkout-number-input" value={form.number} onChange={set("number")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-300">Complemento</Label>
                  <Input value={form.complement} onChange={set("complement")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-zinc-300">Bairro</Label>
                  <Input data-testid="checkout-neighborhood-input" value={form.neighborhood} onChange={set("neighborhood")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5 space-y-4">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Pagamento</div>
            <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-3 gap-2">
              {[["pix", "Pix"], ["cash", "Dinheiro"], ["card", "Cartão"]].map(([v, l]) => (
                <label key={v} className={`cursor-pointer rounded-xl border px-3 py-3 flex items-center gap-2 justify-center ${payment === v ? "border-[#FF5500] bg-[#FF5500]/10" : "border-white/10 bg-[#0D0D0F]"}`}>
                  <RadioGroupItem value={v} data-testid={`checkout-payment-${v}`} className="border-white/40" />
                  <span className="text-sm font-medium">{l}</span>
                </label>
              ))}
            </RadioGroup>
            {payment === "cash" && (
              <div>
                <Label className="text-zinc-300">Troco para (R$)</Label>
                <Input type="number" step="0.01" value={form.change_for} onChange={set("change_for")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: 100.00" />
              </div>
            )}
            <div>
              <Label className="text-zinc-300">Observações do pedido</Label>
              <Textarea value={form.notes} onChange={set("notes")} className="bg-[#0D0D0F] border-white/10 mt-1" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold mb-3">Resumo</div>
            <div className="space-y-1.5 text-sm">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-zinc-300">
                    {it.quantity}× {it.product_name}{it.size_name ? ` (${it.size_name})` : ""}
                  </span>
                  <span className="font-mono text-zinc-200">
                    {formatBRL(((it.unit_price + (it.addons || []).reduce((s, a) => s + a.price, 0)) * it.quantity))}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between"><span className="text-zinc-400">Subtotal</span><span className="font-mono">{formatBRL(subtotal)}</span></div>
              {orderType === "delivery" && (
                <div className="flex items-center justify-between"><span className="text-zinc-400">Taxa de entrega</span><span className="font-mono">{formatBRL(deliveryFee)}</span></div>
              )}
              <div className="flex items-center justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span className="font-mono text-orange-400" data-testid="checkout-total">{formatBRL(total)}</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            data-testid="checkout-submit-button"
            className="w-full bg-[#FF5500] hover:bg-[#FF6B1A] disabled:opacity-60 text-white font-semibold rounded-2xl py-4 shadow-lg shadow-[#FF5500]/25 text-base"
          >
            {submitting ? "Enviando…" : "ENVIAR PEDIDO"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { slug } = useParams();
  const [lojista, setLojista] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/public/lojistas/${slug}`);
      setLojista(data.lojista);
    })();
  }, [slug]);
  if (!lojista) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Carregando…</div>;
  return (
    <CartProvider slug={slug}>
      <CheckoutInner slug={slug} lojista={lojista} />
    </CartProvider>
  );
}

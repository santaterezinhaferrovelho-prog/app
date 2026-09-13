import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CartProvider, useCart } from "@/context/CartContext";
import api, { formatBRL } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

function CheckoutInner({ slug, lojista }) {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState("delivery");
  const [payment, setPayment] = useState("pix");
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "",
    address: "", number: "", postal_code: "", complement: "", neighborhood: "",
    notes: "", change_for: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [lookingUpPostalCode, setLookingUpPostalCode] = useState(false);
  const submittedRef = useRef(false);

  const deliveryFee = orderType === "delivery" ? (deliveryQuote?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    // Only bounce back if the cart is empty AND we haven't just submitted
    if (items.length === 0 && !submittedRef.current) navigate(`/${slug}`, { replace: true });
  }, [items, slug, navigate]);

  useEffect(() => {
    if (orderType !== "delivery" || !form.address || !form.number || !form.neighborhood) {
      setDeliveryQuote(null);
      setQuoteError("");
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoting(true);
      setQuoteError("");
      try {
        const { data } = await api.get(`/public/lojistas/${slug}/delivery-quote`, {
          params: { address: form.address, number: form.number, neighborhood: form.neighborhood, postal_code: form.postal_code },
        });
        if (!cancelled) setDeliveryQuote(data);
      } catch (e) {
        if (!cancelled) {
          setDeliveryQuote(null);
          setQuoteError(e.response?.data?.detail || "Não foi possível calcular a entrega.");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.address, form.number, form.neighborhood, form.postal_code, orderType, slug]);

  useEffect(() => {
    const digits = form.postal_code.replace(/\D/g, "");
    if (orderType !== "delivery" || digits.length !== 8) return undefined;
    let cancelled = false;
    setLookingUpPostalCode(true);
    api.get(`/public/address-by-postal-code/${digits}`)
      .then(({ data }) => {
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          address: data.address || current.address,
          neighborhood: [data.neighborhood, data.city && `${data.city} - ${data.state}`].filter(Boolean).join(", "),
        }));
      })
      .catch(() => {
        if (!cancelled) setQuoteError("CEP não encontrado. Confira o número informado.");
      })
      .finally(() => {
        if (!cancelled) setLookingUpPostalCode(false);
      });
    return () => { cancelled = true; };
  }, [form.postal_code, orderType]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    if (orderType === "delivery" && (!form.address || !form.number || !form.neighborhood || !form.postal_code)) {
      toast.error("Preencha endereço, número, bairro, cidade, estado e CEP.");
      return;
    }
    if (orderType === "delivery" && (!deliveryQuote || quoting)) {
      toast.error(quoting ? "Aguarde o cálculo da entrega." : quoteError || "Não foi possível calcular a entrega.");
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
        postal_code: form.postal_code,
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
        subtotal, delivery_fee: deliveryFee, delivery_distance_km: deliveryQuote?.distance_km || null, total,
        notes: form.notes,
      };
      const { data } = await api.post(`/public/lojistas/${slug}/orders`, body);
      submittedRef.current = true;
      // Open WhatsApp with pre-composed message if lojista has a number.
      // window.open must run inside this click handler to avoid popup blocking.
      const waLink = buildWhatsAppLink(data, lojista);
      if (waLink) {
        try { window.open(waLink, "_blank", "noopener,noreferrer"); } catch (_) { /* noop */ }
      }
      navigate(`/${slug}/success/${data.id}`, { state: { order: data, lojista } });
      // Clear AFTER navigate so the useEffect above doesn't fire and bounce back
      setTimeout(() => clear(), 0);
    } catch (e) {
      const detail = e.response?.data?.detail;
      console.error("checkout submit failed:", e);
      toast.error(typeof detail === "string" ? detail : "Não foi possível enviar o pedido. Tente novamente.");
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
                  <Input data-testid="checkout-address-input" value={form.address} readOnly className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Preenchido pelo CEP" />
                </div>
                <div>
                  <Label className="text-zinc-300">Número</Label>
                  <Input data-testid="checkout-number-input" value={form.number} onChange={set("number")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-300">CEP</Label>
                  <Input data-testid="checkout-postal-code-input" value={form.postal_code} onChange={set("postal_code")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="00000-000" />
                  {lookingUpPostalCode && <div className="text-xs text-zinc-500 mt-1">Localizando endereço pelo CEP…</div>}
                </div>
                <div>
                  <Label className="text-zinc-300">Complemento</Label>
                  <Input value={form.complement} onChange={set("complement")} className="bg-[#0D0D0F] border-white/10 mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-zinc-300">Bairro, cidade e estado</Label>
                  <Input data-testid="checkout-neighborhood-input" value={form.neighborhood} readOnly className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Preenchido pelo CEP" />
                </div>
                <div className="sm:col-span-2 text-sm">
                  {quoting && <span className="text-zinc-400">Calculando distância e taxa de entrega…</span>}
                  {!quoting && deliveryQuote?.same_neighborhood && (
                    <span className="text-emerald-400">Mesmo bairro da loja: taxa fixa aplicada</span>
                  )}
                  {!quoting && deliveryQuote && !deliveryQuote.same_neighborhood && (
                    <span className="text-emerald-400">Distância estimada: {deliveryQuote.distance_km.toFixed(2)} km</span>
                  )}
                  {!quoting && quoteError && <span className="text-rose-400">{quoteError}</span>}
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
              {items.map((it) => (
                <div key={it.uid} className="flex items-center justify-between">
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
                <>
                  <div className="flex items-center justify-between"><span className="text-zinc-400">Taxa de entrega</span><span className="font-mono">{formatBRL(deliveryFee)}</span></div>
                  {deliveryQuote?.same_neighborhood && <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Entrega</span><span className="font-mono text-zinc-400">Mesmo bairro</span></div>}
                  {deliveryQuote && !deliveryQuote.same_neighborhood && <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Distância</span><span className="font-mono text-zinc-400">{deliveryQuote.distance_km.toFixed(2)} km</span></div>}
                </>
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

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, MapPin, Clock, Instagram, Phone, Plus, Minus, X, UtensilsCrossed, MessageCircle } from "lucide-react";
import api, { resolveImg, formatBRL } from "@/lib/api";
import { CartProvider, useCart } from "@/context/CartContext";
import { computeOpenStatus } from "@/lib/hours";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function priceFrom(product) {
  if (!product.sizes?.length) return 0;
  return Math.min(...product.sizes.map((s) => s.price));
}

function ProductCard({ product, onOpen }) {
  const img = resolveImg(product.image_url);
  return (
    <button
      onClick={() => onOpen(product)}
      data-testid={`product-card-${product.id}`}
      className="group relative text-left bg-[#1A1A1E] hover:bg-[#222226] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#FF5500]/40 hover:shadow-xl hover:shadow-[#FF5500]/5 flex flex-col"
    >
      <div className="aspect-[4/3] bg-[#0D0D0F] overflow-hidden">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <UtensilsCrossed className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col gap-1">
        <div className="font-display font-semibold text-base sm:text-lg text-zinc-100 line-clamp-1">{product.name}</div>
        <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed min-h-[2rem]">{product.description}</div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-zinc-500">
            {product.sizes?.map((s) => s.name).join(" · ") || "—"}
          </div>
          <div className="text-[#FF9A57] font-mono font-bold text-sm">
            a partir de {formatBRL(priceFrom(product))}
          </div>
        </div>
      </div>
    </button>
  );
}

function ProductDetailDialog({ product, onClose }) {
  const { addItem } = useCart();
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);

  useEffect(() => {
    setSizeIdx(0); setQty(1); setObs(""); setSelectedAddons([]);
  }, [product]);

  if (!product) return null;
  const size = product.sizes?.[sizeIdx] || { name: "Único", price: 0 };
  const img = resolveImg(product.image_url);
  const addonsSum = selectedAddons.reduce((s, a) => s + a.price, 0);
  const totalPrice = (size.price + addonsSum) * qty;

  const toggleAddon = (a) => {
    setSelectedAddons((prev) =>
      prev.find((x) => x.name === a.name) ? prev.filter((x) => x.name !== a.name) : [...prev, a]
    );
  };

  const addToCart = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      size_name: size.name,
      quantity: qty,
      unit_price: size.price,
      addons: selectedAddons,
      observation: obs,
      image_url: product.image_url,
    });
    toast.success(`${qty}× ${product.name} adicionado ao carrinho`);
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-[#0D0D0F] border-white/10 text-zinc-100 p-0 max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        data-testid="product-detail-dialog"
      >
        <VisuallyHidden.Root>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </VisuallyHidden.Root>
        <div className="relative aspect-[16/10] bg-[#17171A] shrink-0">
          {img ? (
            <img src={img} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700">
              <UtensilsCrossed className="h-14 w-14" />
            </div>
          )}
          <button
            onClick={onClose}
            data-testid="close-product-dialog-btn"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <h2 className="font-display text-2xl font-bold">{product.name}</h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{product.description}</p>

          {product.sizes?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                Escolha o tamanho
              </div>
              <div className="grid grid-cols-3 gap-2">
                {product.sizes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSizeIdx(i)}
                    data-testid={`product-size-radio-${s.name.toLowerCase()}`}
                    className={
                      sizeIdx === i
                        ? "bg-[#FF5500]/15 border-2 border-[#FF5500] text-orange-300 font-bold rounded-xl px-3 py-3 text-center"
                        : "bg-[#17171A] border border-white/10 text-zinc-300 rounded-xl px-3 py-3 text-center hover:border-zinc-700"
                    }
                  >
                    <div className="font-display text-base">{s.name}</div>
                    <div className="font-mono text-[11px] mt-1 text-zinc-400">{formatBRL(s.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.addons?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Adicionais</div>
              <div className="grid gap-2">
                {product.addons.map((a) => {
                  const checked = !!selectedAddons.find((x) => x.name === a.name);
                  return (
                    <label
                      key={a.name}
                      data-testid={`addon-toggle-${a.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 cursor-pointer ${
                        checked ? "border-[#FF5500]/60 bg-[#FF5500]/10" : "border-white/10 bg-[#17171A]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(a)}
                          className="accent-[#FF5500] h-4 w-4"
                        />
                        <span className="text-sm">{a.name}</span>
                      </div>
                      <span className="font-mono text-xs text-zinc-400">+ {formatBRL(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Observação</div>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: sem cebola, pouca pimenta…"
              data-testid="product-observation-input"
              className="bg-[#17171A] border-white/10 text-zinc-200 min-h-[70px]"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex items-center gap-3 shrink-0 bg-[#0D0D0F]">
          <div className="flex items-center gap-2 bg-[#17171A] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              data-testid="product-qty-decrease-btn"
              className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-semibold" data-testid="product-qty-value">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              data-testid="product-qty-increase-btn"
              className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={addToCart}
            data-testid="add-to-cart-button"
            className="flex-1 bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-[#FF5500]/25 transition-all active:scale-[0.98]"
          >
            <ShoppingCart className="h-4 w-4" />
            Adicionar · {formatBRL(totalPrice)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CartSheet({ open, onOpenChange, slug, deliveryFee }) {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const navigate = useNavigate();
  const total = subtotal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#0D0D0F] border-white/10 text-zinc-100 w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-zinc-100 font-display text-2xl">Meu pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-3">
          {items.length === 0 && (
            <div className="text-center text-zinc-500 py-16 text-sm">Seu carrinho está vazio.</div>
          )}
          {items.map((it, i) => {
            const addonsSum = (it.addons || []).reduce((s, a) => s + a.price, 0);
            const lineTotal = (it.unit_price + addonsSum) * it.quantity;
            return (
              <div key={i} data-testid={`cart-line-${i}`} className="rounded-xl border border-white/10 bg-[#17171A] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">
                      {it.product_name}
                      {it.size_name && <span className="ml-2 text-zinc-400 text-xs">· {it.size_name}</span>}
                    </div>
                    {it.addons?.length > 0 && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        + {it.addons.map((a) => a.name).join(", ")}
                      </div>
                    )}
                    {it.observation && (
                      <div className="text-xs text-zinc-500 italic mt-0.5">&ldquo;{it.observation}&rdquo;</div>
                    )}
                  </div>
                  <button onClick={() => removeItem(i)} data-testid={`cart-remove-${i}`} className="text-zinc-500 hover:text-rose-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 bg-[#0D0D0F] border border-white/10 rounded-lg p-0.5">
                    <button onClick={() => updateQty(i, -1)} data-testid={`cart-dec-${i}`} className="h-7 w-7 hover:bg-white/5 rounded-md flex items-center justify-center">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                    <button onClick={() => updateQty(i, 1)} data-testid={`cart-inc-${i}`} className="h-7 w-7 hover:bg-white/5 rounded-md flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="font-mono text-sm text-orange-300 font-bold">{formatBRL(lineTotal)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="font-mono">{formatBRL(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span className="font-mono text-orange-400" data-testid="cart-total-value">{formatBRL(total)}</span>
            </div>
            <button
              onClick={() => { onOpenChange(false); navigate(`/${slug}/checkout`); }}
              data-testid="cart-checkout-button"
              className="w-full bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-[#FF5500]/25"
            >
              FINALIZAR PEDIDO
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StorefrontInner({ data, slug }) {
  const { lojista, categories, products } = data;
  const [activeCat, setActiveCat] = useState("all");
  const [openProduct, setOpenProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalCount, subtotal } = useCart();

  const filtered = useMemo(() => {
    if (activeCat === "all") return products;
    return products.filter((p) => p.category_id === activeCat);
  }, [activeCat, products]);

  const cover = resolveImg(lojista.cover_url);
  const logo = resolveImg(lojista.logo_url);
  const status = computeOpenStatus(lojista);
  const waNumber = (lojista.whatsapp || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber.length <= 11 ? "55" + waNumber : waNumber}` : null;
  const mapsHref = lojista.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lojista.address)}` : null;
  const grouped = useMemo(() => {
    if (activeCat !== "all") return [{ cat: categories.find((c) => c.id === activeCat), items: filtered }];
    return categories.map((c) => ({ cat: c, items: products.filter((p) => p.category_id === c.id) })).filter((g) => g.items.length);
  }, [activeCat, categories, products, filtered]);

  return (
    <div className="min-h-screen pb-32">
      {/* Header / Hero with overlapping logo */}
      <div className="relative">
        <div className="h-48 sm:h-64 relative overflow-hidden bg-gradient-to-br from-[#1a0f0a] via-[#0D0D0F] to-[#17171A]">
          {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#0D0D0F]" />

          {/* Open / closed indicator overlay */}
          {status.open !== null && (
            <div
              data-testid="open-status-pill"
              className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md border ${
                status.open
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              {status.label}
            </div>
          )}

          {/* Logo overlapping the cover, centered */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-44px] sm:bottom-[-52px] z-10">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-[#0D0D0F] bg-[#17171A] overflow-hidden shadow-2xl shadow-black/60">
              {logo ? (
                <img src={logo} alt={lojista.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#FF5500]">
                  <UtensilsCrossed className="h-9 w-9" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-16 sm:pt-20 max-w-4xl mx-auto text-center">
          <h1 data-testid="restaurant-name-header" className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            {lojista.name}
          </h1>
          <div className="text-sm text-zinc-400 mt-1">{lojista.description}</div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
            {lojista.address && (<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lojista.address}</span>)}
            {lojista.hours && (<span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{lojista.hours}</span>)}
            {lojista.instagram && (<span className="inline-flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />{lojista.instagram}</span>)}
            {lojista.phone && (<span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lojista.phone}</span>)}
          </div>

          {/* Action buttons: WhatsApp + Google Maps */}
          {(waHref || mapsHref) && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="whatsapp-cta"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 px-4 py-2 text-sm font-semibold transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="maps-cta"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1E] hover:bg-[#222226] border border-white/10 text-zinc-200 px-4 py-2 text-sm font-semibold transition-all"
                >
                  <MapPin className="h-4 w-4 text-[#FF5500]" />
                  Ver no Google Maps
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="sticky top-0 z-30 bg-[#0D0D0F]/85 backdrop-blur-xl border-b border-white/10 mt-6">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            data-testid="category-chip-all"
            onClick={() => setActiveCat("all")}
            className={activeCat === "all"
              ? "bg-[#FF5500] text-white font-semibold rounded-full px-4 py-2 text-sm whitespace-nowrap chip-glow"
              : "bg-[#1A1A1E] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-white/5 rounded-full px-4 py-2 text-sm whitespace-nowrap"}
          >Tudo</button>
          {categories.map((c) => (
            <button
              key={c.id}
              data-testid={`category-chip-${c.id}`}
              onClick={() => setActiveCat(c.id)}
              className={activeCat === c.id
                ? "bg-[#FF5500] text-white font-semibold rounded-full px-4 py-2 text-sm whitespace-nowrap chip-glow"
                : "bg-[#1A1A1E] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-white/5 rounded-full px-4 py-2 text-sm whitespace-nowrap"}
            >
              {c.icon && <span className="mr-1.5">{c.icon}</span>}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product listing */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {grouped.map(({ cat, items }) => (
          <section key={cat?.id || "x"}>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
              {cat?.icon && <span>{cat.icon}</span>}
              {cat?.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={setOpenProduct} />
              ))}
            </div>
          </section>
        ))}
        {products.length === 0 && (
          <div className="text-center text-zinc-500 py-20">Nenhum produto disponível ainda.</div>
        )}
      </div>

      {/* Floating cart */}
      {totalCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          data-testid="floating-cart-bar"
          className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 bg-[#FF5500] hover:bg-[#FF6B1A] text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-[#FF5500]/40 flex items-center justify-between font-semibold active:scale-[0.98] transition-all"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span data-testid="floating-cart-count">{totalCount} {totalCount === 1 ? "item" : "itens"}</span>
          </span>
          <span className="font-mono">{formatBRL(subtotal)}</span>
        </button>
      )}

      <ProductDetailDialog product={openProduct} onClose={() => setOpenProduct(null)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} slug={slug} deliveryFee={lojista.delivery_fee || 0} />
    </div>
  );
}

export default function PublicStorefront() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public/lojistas/${slug}`);
        setData(data);
      } catch (e) {
        setErr("Loja não encontrada");
      }
    })();
  }, [slug]);

  if (err) return <div className="min-h-screen flex items-center justify-center text-zinc-400">{err}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Carregando cardápio…</div>;

  return (
    <CartProvider slug={slug}>
      <StorefrontInner data={data} slug={slug} />
    </CartProvider>
  );
}

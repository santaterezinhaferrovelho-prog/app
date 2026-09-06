import { Link } from "react-router-dom";
import { UtensilsCrossed, ArrowRight, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-zinc-400 mb-8">
          <span className="h-2 w-2 rounded-full bg-[#FF5500] animate-pulse" />
          Plataforma multi-lojista
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight">
          Seu cardápio digital,
          <br />
          <span className="text-[#FF5500]">pedidos direto no bolso.</span>
        </h1>
        <p className="mt-6 text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
          Um sistema completo de pedidos online para restaurantes, bares e lanchonetes.
          Rápido, prático, mobile-first — sem depender de app externo.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            to="/tanahora"
            data-testid="visit-demo-storefront-btn"
            className="group flex items-center justify-between rounded-2xl bg-[#FF5500] hover:bg-[#FF6B1A] px-5 py-4 font-semibold text-white transition-all shadow-lg shadow-[#FF5500]/25"
          >
            <span className="flex items-center gap-3">
              <UtensilsCrossed className="h-5 w-5" />
              Ver cardápio: Tá Na Hora
            </span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/admin/login"
            data-testid="visit-admin-btn"
            className="group flex items-center justify-between rounded-2xl bg-[#1A1A1E] hover:bg-[#222226] border border-white/10 px-5 py-4 font-semibold text-zinc-100 transition-all"
          >
            <span className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#FF5500]" />
              Entrar como lojista
            </span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Cardápio editável", "Produtos, fotos, tamanhos e preços controlados pelo lojista."],
            ["Multi-lojista", "Cada estabelecimento com sua própria página em /slug."],
            ["Mobile-first", "Experiência otimizada para celular, com carrinho flutuante."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5">
              <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">{t}</div>
              <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useLocation, useParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/api";

export default function OrderSuccess() {
  const { state } = useLocation();
  const { slug } = useParams();
  const order = state?.order;
  const lojista = state?.lojista;

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#1A1A1E] p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </div>
        <h1 className="font-display text-2xl font-extrabold">Pedido enviado!</h1>
        <p className="text-zinc-400 text-sm mt-2">
          {lojista?.name || "O restaurante"} recebeu seu pedido e entrará em contato pelo telefone informado.
        </p>
        {order && (
          <div className="mt-6 rounded-xl bg-[#0D0D0F] border border-white/10 p-4 text-left text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-zinc-400">Pedido</span><span className="font-mono">#{order.order_number || order.id.slice(0, 6)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Total</span><span className="font-mono text-orange-400 font-bold">{formatBRL(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Tipo</span><span>{order.order_type === "delivery" ? "Delivery" : "Retirada"}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Pagamento</span><span className="capitalize">{order.payment_method}</span></div>
          </div>
        )}
        <Link to={`/${slug}`} data-testid="back-to-menu-btn" className="mt-6 inline-block w-full bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-semibold rounded-xl py-3">
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}

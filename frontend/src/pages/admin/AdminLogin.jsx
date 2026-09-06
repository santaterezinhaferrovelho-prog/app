import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, UtensilsCrossed } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo!");
      nav("/admin", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <Link to="/" className="flex items-center gap-2 mb-8 text-zinc-400 hover:text-zinc-200">
          <UtensilsCrossed className="h-5 w-5 text-[#FF5500]" />
          <span className="font-display font-bold text-lg text-zinc-100">Pedidos.app</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold">Painel do lojista</h1>
        <p className="text-zinc-400 text-sm mt-1">Entre para gerenciar seu cardápio e pedidos.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label className="text-zinc-300">E-mail</Label>
            <Input data-testid="admin-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#17171A] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-300">Senha</Label>
            <Input data-testid="admin-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#17171A] border-white/10 mt-1" />
          </div>
          <button data-testid="admin-login-submit" disabled={loading} className="w-full bg-[#FF5500] hover:bg-[#FF6B1A] disabled:opacity-60 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-[#FF5500]/25">
            <LogIn className="h-4 w-4" /> {loading ? "Entrando…" : "Entrar"}
          </button>
          <div className="text-center text-sm text-zinc-500 pt-1">
            Ainda não tem conta? <Link to="/admin/register" data-testid="link-to-register" className="text-[#FF9A57] hover:underline">Cadastre seu restaurante</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

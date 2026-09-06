import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Rocket, UtensilsCrossed, Check, X } from "lucide-react";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function AdminRegister() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    business_name: "", slug: "", owner_email: "", owner_password: "",
    address: "", whatsapp: "", hours: "", description: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Auto-fill slug from business name until user edits it
  useEffect(() => {
    if (!slugEdited) {
      setForm((f) => ({ ...f, slug: slugify(f.business_name) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.business_name]);

  // Live slug availability check (debounced)
  useEffect(() => {
    const s = form.slug;
    if (!s || s.length < 3) { setSlugStatus(null); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-slug/${encodeURIComponent(s)}`);
        setSlugStatus(data.available ? "available" : (data.reason === "invalid" ? "invalid" : "taken"));
      } catch { setSlugStatus(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [form.slug]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${form.slug || "sua-loja"}`;
  }, [form.slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.slug || !form.owner_email || !form.owner_password) {
      return toast.error("Preencha os campos obrigatórios.");
    }
    if (form.owner_password.length < 6) {
      return toast.error("A senha deve ter ao menos 6 caracteres.");
    }
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      // Auto-login using the same credentials so context updates cleanly
      await login(form.owner_email, form.owner_password);
      toast.success("Conta criada! Bem-vindo(a).");
      nav("/admin", { replace: true });
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Falha ao cadastrar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-8 text-zinc-400 hover:text-zinc-200">
          <UtensilsCrossed className="h-5 w-5 text-[#FF5500]" />
          <span className="font-display font-bold text-lg text-zinc-100">Pedidos.app</span>
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold">Cadastre seu restaurante</h1>
        <p className="text-zinc-400 text-sm mt-1">Grátis para começar. Você já vai receber pedidos em minutos.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Sobre o estabelecimento</div>
            <div>
              <Label className="text-zinc-300">Nome do restaurante *</Label>
              <Input
                data-testid="register-business-name"
                value={form.business_name} onChange={set("business_name")}
                className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: Burger do Zé"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Endereço da sua loja *</Label>
              <Input
                data-testid="register-slug"
                value={form.slug}
                onChange={(e) => { setSlugEdited(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
                className="bg-[#0D0D0F] border-white/10 mt-1 font-mono"
                placeholder="burger-do-ze"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-500 truncate">{publicUrl}</span>
                <span data-testid="register-slug-status" className={
                  slugStatus === "available" ? "text-emerald-400 inline-flex items-center gap-1"
                  : slugStatus === "taken" ? "text-rose-400 inline-flex items-center gap-1"
                  : slugStatus === "invalid" ? "text-rose-400 inline-flex items-center gap-1"
                  : "text-zinc-500"
                }>
                  {slugStatus === "available" && (<><Check className="h-3 w-3" /> disponível</>)}
                  {slugStatus === "taken" && (<><X className="h-3 w-3" /> em uso</>)}
                  {slugStatus === "invalid" && (<><X className="h-3 w-3" /> inválido</>)}
                  {slugStatus === "checking" && "verificando…"}
                </span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">WhatsApp</Label>
                <Input data-testid="register-whatsapp" value={form.whatsapp} onChange={set("whatsapp")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="(11) 90000-0000" />
              </div>
              <div>
                <Label className="text-zinc-300">Endereço físico</Label>
                <Input value={form.address} onChange={set("address")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Rua, nº — Cidade/UF" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-zinc-300">Horário (texto)</Label>
                <Input value={form.hours} onChange={set("hours")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: Seg a sáb — 18:00 às 23:30" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-zinc-300">Descrição curta</Label>
                <Textarea value={form.description} onChange={set("description")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Uma frase que descreve seu restaurante" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Seu acesso</div>
            <div>
              <Label className="text-zinc-300">E-mail *</Label>
              <Input data-testid="register-email" type="email" value={form.owner_email} onChange={set("owner_email")} className="bg-[#0D0D0F] border-white/10 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-300">Senha * <span className="text-zinc-500 text-xs">(mín. 6 caracteres)</span></Label>
              <Input data-testid="register-password" type="password" value={form.owner_password} onChange={set("owner_password")} className="bg-[#0D0D0F] border-white/10 mt-1" />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading || slugStatus === "taken" || slugStatus === "invalid"}
            data-testid="register-submit"
            className="w-full bg-[#FF5500] hover:bg-[#FF6B1A] disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-[#FF5500]/25"
          >
            <Rocket className="h-4 w-4" />
            {loading ? "Criando sua conta…" : "Criar minha loja"}
          </button>

          <div className="text-center text-sm text-zinc-500">
            Já tem conta? <Link to="/admin/login" className="text-[#FF9A57] hover:underline">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

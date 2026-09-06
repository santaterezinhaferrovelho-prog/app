import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ExternalLink, Store } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { slug: "", name: "", owner_email: "", owner_password: "", description: "", address: "", hours: "", whatsapp: "" };

export default function SuperAdmin() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/super/lojistas");
      setRows(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Falha ao carregar");
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async () => {
    if (!form.slug || !form.name || !form.owner_email || !form.owner_password) {
      return toast.error("Preencha slug, nome, e-mail e senha.");
    }
    setSaving(true);
    try {
      await api.post("/super/lojistas", form);
      toast.success("Lojista criado");
      setOpen(false); setForm(emptyForm); load();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Falha ao criar");
    } finally { setSaving(false); }
  };

  const toggle = async (l) => {
    try {
      await api.patch(`/super/lojistas/${l.id}/toggle`);
      load();
    } catch { toast.error("Falha ao atualizar"); }
  };

  const remove = async (l) => {
    if (!window.confirm(`Excluir definitivamente ${l.name}? Isso apagará produtos, pedidos e usuários vinculados.`)) return;
    try {
      await api.delete(`/super/lojistas/${l.id}`);
      toast.success("Lojista excluído");
      load();
    } catch { toast.error("Falha ao excluir"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Store className="h-7 w-7 text-[#FF5500]" /> Super Admin
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie todos os lojistas da plataforma.</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setOpen(true); }}
          data-testid="super-new-lojista-btn"
          className="bg-[#FF5500] hover:bg-[#FF6B1A] rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#FF5500]/25"
        >
          <Plus className="h-4 w-4" /> Novo lojista
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && <div className="text-zinc-500 text-sm">Nenhum lojista cadastrado.</div>}
        {rows.map((l) => (
          <div key={l.id} data-testid={`super-lojista-${l.id}`} className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{l.name}</div>
                <div className="text-xs font-mono text-orange-400 mt-0.5">/{l.slug}</div>
              </div>
              <Switch
                data-testid={`super-toggle-${l.id}`}
                checked={l.active !== false}
                onCheckedChange={() => toggle(l)}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#0D0D0F] border border-white/10 p-2">
                <div className="text-zinc-500">Produtos</div>
                <div className="font-mono text-zinc-200 font-bold">{l.product_count ?? 0}</div>
              </div>
              <div className="rounded-lg bg-[#0D0D0F] border border-white/10 p-2">
                <div className="text-zinc-500">Pedidos</div>
                <div className="font-mono text-zinc-200 font-bold">{l.order_count ?? 0}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`/${l.slug}`} target="_blank" rel="noreferrer"
                className="flex-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg py-1.5 flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Ver loja
              </a>
              <button
                onClick={() => remove(l)}
                data-testid={`super-delete-${l.id}`}
                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg px-3 py-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {l.active === false && (
              <div className="mt-2 text-[11px] text-rose-300 uppercase tracking-wider font-semibold">Desativado</div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0D0D0F] border-white/10 text-zinc-100 max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Novo lojista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Slug (URL)</Label>
                <Input data-testid="super-form-slug" value={form.slug} onChange={set("slug")} className="bg-[#17171A] border-white/10 mt-1 font-mono" placeholder="ex: burger-do-ze" />
              </div>
              <div>
                <Label className="text-zinc-300">Nome</Label>
                <Input data-testid="super-form-name" value={form.name} onChange={set("name")} className="bg-[#17171A] border-white/10 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Descrição</Label>
              <Input value={form.description} onChange={set("description")} className="bg-[#17171A] border-white/10 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Endereço</Label>
                <Input value={form.address} onChange={set("address")} className="bg-[#17171A] border-white/10 mt-1" />
              </div>
              <div>
                <Label className="text-zinc-300">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={set("whatsapp")} className="bg-[#17171A] border-white/10 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Horário (texto)</Label>
              <Input value={form.hours} onChange={set("hours")} className="bg-[#17171A] border-white/10 mt-1" placeholder="Ex.: Seg a sáb — 18:00 às 23:30" />
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold mb-2">Login do proprietário</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300">E-mail</Label>
                  <Input data-testid="super-form-owner-email" type="email" value={form.owner_email} onChange={set("owner_email")} className="bg-[#17171A] border-white/10 mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-300">Senha</Label>
                  <Input data-testid="super-form-owner-password" type="text" value={form.owner_password} onChange={set("owner_password")} className="bg-[#17171A] border-white/10 mt-1" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={create}
                disabled={saving}
                data-testid="super-form-submit"
                className="flex-1 bg-[#FF5500] hover:bg-[#FF6B1A] disabled:opacity-60 text-white font-semibold rounded-xl py-2.5"
              >
                {saving ? "Criando…" : "Criar lojista"}
              </button>
              <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-zinc-300 hover:bg-white/5">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

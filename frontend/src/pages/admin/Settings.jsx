import { useEffect, useState } from "react";
import api, { resolveImg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WEEKDAYS } from "@/lib/hours";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState({ logo: false, cover: false });

  useEffect(() => { api.get("/admin/lojista").then(({ data }) => setForm(data)); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try {
      await api.put("/admin/lojista", {
        name: form.name, description: form.description, phone: form.phone,
        whatsapp: form.whatsapp, instagram: form.instagram, address: form.address,
        store_postal_code: form.store_postal_code || "",
        hours: form.hours, primary_color: form.primary_color,
        open_days: form.open_days || [],
        open_start: form.open_start || "",
        open_end: form.open_end || "",
        delivery_fee: parseFloat(form.delivery_fee_per_km ?? form.delivery_fee ?? 0) || 0,
        delivery_fee_per_km: parseFloat(form.delivery_fee_per_km ?? form.delivery_fee ?? 0) || 0,
        store_neighborhood: form.store_neighborhood || "",
        delivery_fee_same_neighborhood: parseFloat(form.delivery_fee_same_neighborhood || 0) || 0,
        logo_url: form.logo_url, cover_url: form.cover_url,
      });
      toast.success("Configurações salvas");
    } catch { toast.error("Falha ao salvar"); }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [kind]: true }));
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "cover_url"]: data.url }));
      toast.success("Imagem enviada");
    } catch { toast.error("Falha no upload"); } finally { setUploading((u) => ({ ...u, [kind]: false })); }
  };

  const deleteImage = async (kind) => {
    if (!window.confirm(`Excluir ${kind === "logo" ? "logo" : "capa"}?`)) return;
    try {
      const { data } = await api.delete(`/admin/lojista/image/${kind}`);
      setForm(data);
      toast.success("Imagem removida");
    } catch { toast.error("Falha ao excluir"); }
  };

  const toggleDay = (d) => {
    const cur = form.open_days || [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
    setForm({ ...form, open_days: next });
  };

  if (!form) return <div className="text-zinc-500">Carregando…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold">Configurações da loja</h1>
      <p className="text-zinc-400 text-sm mt-1">
        Página pública em <span className="font-mono text-orange-400">/{form.slug}</span>
      </p>

      <div className="mt-6 grid gap-6">
        <div className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Imagens</div>
          <div className="grid grid-cols-2 gap-3">
            {[["logo", "logo_url", "Logo"], ["cover", "cover_url", "Capa"]].map(([kind, key, label]) => (
              <div key={kind}>
                <div className="text-xs text-zinc-400 mb-1.5">{label}</div>
                <div className="aspect-video bg-[#0D0D0F] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center relative">
                  {form[key] ? (
                    <img src={resolveImg(form[key])} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-zinc-700" />
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="text-xs text-zinc-300 hover:text-white cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {uploading[kind] ? "Enviando…" : "Alterar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      data-testid={`settings-${kind}-upload`}
                      onChange={(e) => upload(kind, e.target.files?.[0])}
                    />
                  </label>
                  {form[key] && (
                    <button
                      type="button"
                      onClick={() => deleteImage(kind)}
                      data-testid={`settings-${kind}-delete`}
                      className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Identidade</div>
          <div><Label className="text-zinc-300">Nome</Label><Input data-testid="settings-name" value={form.name || ""} onChange={set("name")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
          <div><Label className="text-zinc-300">Descrição</Label><Textarea data-testid="settings-description" value={form.description || ""} onChange={set("description")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Contato & endereço</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-zinc-300">Telefone</Label><Input value={form.phone || ""} onChange={set("phone")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
            <div><Label className="text-zinc-300">WhatsApp</Label><Input data-testid="settings-whatsapp" value={form.whatsapp || ""} onChange={set("whatsapp")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="(11) 90000-0000" /></div>
            <div><Label className="text-zinc-300">Instagram</Label><Input value={form.instagram || ""} onChange={set("instagram")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
            <div><Label className="text-zinc-300">Endereço (será usado no mapa)</Label><Input data-testid="settings-address" value={form.address || ""} onChange={set("address")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
            <div><Label className="text-zinc-300">CEP da loja</Label><Input data-testid="settings-store-postal-code" value={form.store_postal_code || ""} onChange={set("store_postal_code")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="00000-000" /></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Horário de funcionamento</div>
          <div>
            <Label className="text-zinc-300">Texto exibido no cardápio</Label>
            <Input value={form.hours || ""} onChange={set("hours")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: Terça a sábado — 11:00 às 14:30" />
          </div>
          <div>
            <Label className="text-zinc-300">Dias abertos</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = (form.open_days || []).includes(d.v);
                return (
                  <button
                    type="button"
                    key={d.v}
                    onClick={() => toggleDay(d.v)}
                    data-testid={`settings-openday-${d.v}`}
                    className={`text-xs rounded-full px-3 py-1.5 border ${active ? "bg-[#FF5500] border-[#FF5500] text-white" : "bg-[#0D0D0F] border-white/10 text-zinc-300"}`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-zinc-300">Abre às</Label><Input type="time" data-testid="settings-open-start" value={form.open_start || ""} onChange={set("open_start")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
            <div><Label className="text-zinc-300">Fecha às</Label><Input type="time" data-testid="settings-open-end" value={form.open_end || ""} onChange={set("open_end")} className="bg-[#0D0D0F] border-white/10 mt-1" /></div>
          </div>
          <div className="text-xs text-zinc-500">O indicador Aberto/Fechado aparece na página pública automaticamente com base nesses campos.</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#1A1A1E] p-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-[#FF5500] font-semibold">Pedidos</div>
          <div>
            <Label className="text-zinc-300">Valor da entrega por km (R$)</Label>
            <Input data-testid="settings-delivery-fee" type="number" min="0" step="0.01" value={form.delivery_fee_per_km ?? form.delivery_fee ?? 0} onChange={set("delivery_fee_per_km")} className="bg-[#0D0D0F] border-white/10 mt-1" />
            <div className="text-xs text-zinc-500 mt-1">A taxa será calculada multiplicando este valor pela distância entre a loja e o cliente.</div>
          </div>
          <div>
            <Label className="text-zinc-300">Bairro da loja</Label>
            <Input data-testid="settings-store-neighborhood" value={form.store_neighborhood || ""} onChange={set("store_neighborhood")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: Centro" />
          </div>
          <div>
            <Label className="text-zinc-300">Valor fixo para o mesmo bairro (R$)</Label>
            <Input data-testid="settings-same-neighborhood-fee" type="number" min="0" step="0.01" value={form.delivery_fee_same_neighborhood || 0} onChange={set("delivery_fee_same_neighborhood")} className="bg-[#0D0D0F] border-white/10 mt-1" placeholder="Ex.: 5.00" />
            <div className="text-xs text-zinc-500 mt-1">Quando o cliente estiver no mesmo bairro, este valor será usado no lugar da rota por quilômetro.</div>
          </div>
        </div>

        <button data-testid="settings-save" onClick={save} className="bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-semibold rounded-xl py-3 shadow-lg shadow-[#FF5500]/25">Salvar alterações</button>
      </div>
    </div>
  );
}

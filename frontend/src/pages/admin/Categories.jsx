import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: "", icon: "" });

  const load = async () => { const { data } = await api.get("/admin/categories"); setCats(data); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return toast.error("Informe o nome");
    await api.post("/admin/categories", { name: form.name, icon: form.icon, order: cats.length, active: true });
    setForm({ name: "", icon: "" }); toast.success("Categoria criada"); load();
  };
  const update = async (c, patch) => {
    await api.put(`/admin/categories/${c.id}`, { name: c.name, icon: c.icon || "", order: c.order || 0, active: c.active, ...patch });
    load();
  };
  const remove = async (c) => {
    if (!window.confirm(`Excluir categoria ${c.name}?`)) return;
    await api.delete(`/admin/categories/${c.id}`); load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Categorias</h1>
      <p className="text-zinc-400 text-sm mt-1">Organize seu cardápio em grupos.</p>

      <div className="mt-5 flex gap-2">
        <Input data-testid="new-category-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="bg-[#17171A] border-white/10 w-20" placeholder="🍛" />
        <Input data-testid="new-category-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#17171A] border-white/10 flex-1" placeholder="Nome da categoria" />
        <button data-testid="new-category-create" onClick={create} className="bg-[#FF5500] hover:bg-[#FF6B1A] rounded-xl px-4 text-sm font-semibold flex items-center gap-1.5"><Plus className="h-4 w-4"/>Criar</button>
      </div>

      <div className="mt-6 space-y-2">
        {cats.map((c, i) => (
          <div key={c.id} data-testid={`category-row-${c.id}`} className="rounded-xl border border-white/8 bg-[#1A1A1E] p-3 flex gap-2 items-center">
            <Input value={c.icon || ""} onChange={(e) => { const arr = [...cats]; arr[i] = { ...c, icon: e.target.value }; setCats(arr); }} className="bg-[#0D0D0F] border-white/10 w-16" />
            <Input value={c.name} onChange={(e) => { const arr = [...cats]; arr[i] = { ...c, name: e.target.value }; setCats(arr); }} className="bg-[#0D0D0F] border-white/10 flex-1" />
            <Switch checked={c.active !== false} onCheckedChange={(v) => update(c, { active: v })} />
            <button onClick={() => update(c, {})} className="text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1"><Save className="h-3 w-3"/>Salvar</button>
            <button onClick={() => remove(c)} className="text-rose-400 p-2 hover:bg-white/5 rounded-lg"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {cats.length === 0 && <div className="text-zinc-500 text-sm">Nenhuma categoria ainda.</div>}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api, { resolveImg, formatBRL } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", description: "", category_id: "", image_url: "", active: true,
  sizes: [{ name: "P", price: 20 }, { name: "M", price: 25 }, { name: "G", price: 30 }],
  addons: [] };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([api.get("/admin/products"), api.get("/admin/categories")]);
    setProducts(p.data); setCategories(c.data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    const cat = categories[0]?.id || "";
    setForm({ ...empty, category_id: cat });
    setEditing("new");
  };
  const openEdit = (p) => {
    setForm({
      name: p.name, description: p.description || "", category_id: p.category_id,
      image_url: p.image_url || "", active: p.active !== false,
      sizes: p.sizes?.length ? p.sizes : empty.sizes,
      addons: p.addons || [],
    });
    setEditing(p.id);
  };

  const save = async () => {
    try {
      if (!form.name || !form.category_id) return toast.error("Nome e categoria são obrigatórios");
      const body = { ...form };
      if (editing === "new") await api.post("/admin/products", body);
      else await api.put(`/admin/products/${editing}`, body);
      toast.success("Produto salvo");
      setEditing(null); load();
    } catch (e) { toast.error("Falha ao salvar"); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Excluir ${p.name}?`)) return;
    await api.delete(`/admin/products/${p.id}`); load();
  };
  const toggle = async (p) => { await api.patch(`/admin/products/${p.id}/toggle`); load(); };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, image_url: data.url }));
      toast.success("Imagem enviada");
    } catch { toast.error("Falha no upload"); } finally { setUploading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Produtos</h1>
          <p className="text-zinc-400 text-sm mt-1">Cadastre, edite e ative produtos do seu cardápio.</p>
        </div>
        <button onClick={openNew} data-testid="new-product-btn" className="bg-[#FF5500] hover:bg-[#FF6B1A] rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#FF5500]/25">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {categories.length === 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm px-4 py-3">
          Crie ao menos uma categoria antes de adicionar produtos.
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const img = resolveImg(p.image_url);
          const cat = categories.find((c) => c.id === p.category_id);
          return (
            <div key={p.id} data-testid={`admin-product-${p.id}`} className="rounded-2xl border border-white/8 bg-[#1A1A1E] overflow-hidden">
              <div className="aspect-[4/3] bg-[#0D0D0F]">
                {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon className="h-8 w-8"/></div>}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 mt-0.5">{cat?.name}</div>
                  </div>
                  <Switch data-testid={`admin-product-toggle-${p.id}`} checked={!!p.active} onCheckedChange={() => toggle(p)} />
                </div>
                <div className="text-xs font-mono text-orange-400 mt-1">
                  {p.sizes?.map((s) => `${s.name} ${formatBRL(s.price)}`).join(" · ")}
                </div>
                <div className="flex gap-2 mt-3">
                  <button data-testid={`admin-product-edit-${p.id}`} onClick={() => openEdit(p)} className="flex-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg py-1.5 flex items-center justify-center gap-1">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button data-testid={`admin-product-delete-${p.id}`} onClick={() => remove(p)} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg px-3 py-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="bg-[#0D0D0F] border-white/10 text-zinc-100 max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing === "new" ? "Novo produto" : "Editar produto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-24 w-24 rounded-xl bg-[#17171A] border border-white/10 overflow-hidden shrink-0">
                {form.image_url ? <img src={resolveImg(form.image_url)} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon className="h-6 w-6"/></div>}
              </div>
              <label className="flex-1 rounded-xl border border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:bg-white/5 text-sm text-zinc-400 gap-2" data-testid="product-image-upload-label">
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando…" : "Enviar foto"}
                <input type="file" accept="image/*" className="hidden" data-testid="product-image-upload-input" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            </div>

            <div>
              <Label className="text-zinc-300">Nome</Label>
              <Input data-testid="product-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#17171A] border-white/10 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-300">Descrição</Label>
              <Textarea data-testid="product-form-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#17171A] border-white/10 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-300">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger data-testid="product-form-category" className="bg-[#17171A] border-white/10 mt-1"><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent className="bg-[#17171A] border-white/10 text-zinc-100">
                  {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-zinc-300">Tamanhos e preços</Label>
              <div className="space-y-2 mt-1">
                {form.sizes.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={s.name} onChange={(e) => { const arr = [...form.sizes]; arr[i] = { ...arr[i], name: e.target.value }; setForm({ ...form, sizes: arr }); }} className="bg-[#17171A] border-white/10 w-24" />
                    <Input type="number" step="0.01" value={s.price} onChange={(e) => { const arr = [...form.sizes]; arr[i] = { ...arr[i], price: parseFloat(e.target.value) || 0 }; setForm({ ...form, sizes: arr }); }} className="bg-[#17171A] border-white/10 flex-1" />
                    <button onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })} className="text-rose-400 p-2 hover:bg-white/5 rounded-lg"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, sizes: [...form.sizes, { name: "", price: 0 }] })} className="text-xs text-orange-400 hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Adicionar tamanho</button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Adicionais</Label>
              <div className="space-y-2 mt-1">
                {form.addons.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={a.name} onChange={(e) => { const arr = [...form.addons]; arr[i] = { ...arr[i], name: e.target.value }; setForm({ ...form, addons: arr }); }} className="bg-[#17171A] border-white/10 flex-1" placeholder="Ex.: Ovo" />
                    <Input type="number" step="0.01" value={a.price} onChange={(e) => { const arr = [...form.addons]; arr[i] = { ...arr[i], price: parseFloat(e.target.value) || 0 }; setForm({ ...form, addons: arr }); }} className="bg-[#17171A] border-white/10 w-28" placeholder="0.00" />
                    <button onClick={() => setForm({ ...form, addons: form.addons.filter((_, j) => j !== i) })} className="text-rose-400 p-2 hover:bg-white/5 rounded-lg"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, addons: [...form.addons, { name: "", price: 0 }] })} className="text-xs text-orange-400 hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Adicionar</button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#17171A] px-3 py-2">
              <div>
                <div className="text-sm font-medium">Produto disponível</div>
                <div className="text-xs text-zinc-500">Aparece no cardápio público</div>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="product-form-active" />
            </div>

            <div className="flex gap-2">
              <button data-testid="product-form-save" onClick={save} className="flex-1 bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-semibold rounded-xl py-2.5">Salvar</button>
              <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-zinc-300 hover:bg-white/5">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

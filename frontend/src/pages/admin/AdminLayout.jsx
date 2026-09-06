import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Package, ListTree, Settings, LogOut, UtensilsCrossed, ExternalLink, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const baseLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, testid: "nav-dashboard" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Pedidos", testid: "nav-orders" },
  { to: "/admin/products", icon: Package, label: "Produtos", testid: "nav-products" },
  { to: "/admin/categories", icon: ListTree, label: "Categorias", testid: "nav-categories" },
  { to: "/admin/settings", icon: Settings, label: "Configurações", testid: "nav-settings" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [lojista, setLojista] = useState(null);
  useEffect(() => {
    api.get("/admin/lojista").then(({ data }) => setLojista(data)).catch(() => {});
  }, []);

  const links = user?.is_super_admin
    ? [...baseLinks, { to: "/admin/super", icon: Store, label: "Super Admin", testid: "nav-super" }]
    : baseLinks;

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex">
      <aside className="hidden md:flex md:w-64 flex-col border-r border-white/10 bg-[#0D0D0F] p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-[#FF5500]" />
          <span className="font-display font-bold text-lg">Pedidos.app</span>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to} to={l.to} end={l.end}
              data-testid={l.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-[#FF5500]/15 text-orange-300 border border-[#FF5500]/30" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"}`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {lojista?.slug && (
            <a href={`/${lojista.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2">
              <ExternalLink className="h-3.5 w-3.5" /> Ver loja pública
            </a>
          )}
          <button
            data-testid="admin-logout-btn"
            onClick={async () => { await logout(); nav("/admin/login", { replace: true }); }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:text-rose-400 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0D0D0F]/90 backdrop-blur border-b border-white/10 p-3 flex items-center gap-3 overflow-x-auto scrollbar-none">
          <UtensilsCrossed className="h-5 w-5 text-[#FF5500] shrink-0" />
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) =>
              `text-xs whitespace-nowrap px-3 py-1.5 rounded-full ${isActive ? "bg-[#FF5500] text-white" : "bg-white/5 text-zinc-300"}`
            }>{l.label}</NavLink>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import PublicStorefront from "@/pages/PublicStorefront";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderSuccess from "@/pages/OrderSuccess";
import Landing from "@/pages/Landing";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminRegister from "@/pages/admin/AdminRegister";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Orders from "@/pages/admin/Orders";
import Products from "@/pages/admin/Products";
import Categories from "@/pages/admin/Categories";
import Settings from "@/pages/admin/Settings";
import SuperAdmin from "@/pages/admin/SuperAdmin";
import OrderPrint from "@/pages/admin/OrderPrint";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-zinc-400">Carregando…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route
            path="/admin/orders/:id/print"
            element={
              <Protected>
                <OrderPrint />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="settings" element={<Settings />} />
            <Route path="super" element={<SuperAdmin />} />
          </Route>
          <Route path="/:slug" element={<PublicStorefront />} />
          <Route path="/:slug/checkout" element={<CheckoutPage />} />
          <Route path="/:slug/success/:orderId" element={<OrderSuccess />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

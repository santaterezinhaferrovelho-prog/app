import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ slug, children }) {
  const key = `cart_${slug}`;
  const [items, setItems] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [items, key]);

  const addItem = (item) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.product_id === item.product_id &&
          p.size_name === item.size_name &&
          (p.observation || "") === (item.observation || "") &&
          JSON.stringify(p.addons) === JSON.stringify(item.addons)
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], quantity: clone[idx].quantity + item.quantity };
        return clone;
      }
      return [...prev, item];
    });
  };

  const updateQty = (index, delta) => {
    setItems((prev) => {
      const clone = [...prev];
      const q = clone[index].quantity + delta;
      if (q <= 0) return clone.filter((_, i) => i !== index);
      clone[index] = { ...clone[index], quantity: q };
      return clone;
    });
  };

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const clear = () => setItems([]);

  const subtotal = items.reduce((sum, it) => {
    const addonsSum = (it.addons || []).reduce((s, a) => s + a.price, 0);
    return sum + (it.unit_price + addonsSum) * it.quantity;
  }, 0);
  const totalCount = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, subtotal, totalCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

// Giỏ hàng lưu ở localStorage, không cho số lượng vượt tồn kho
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '../types';

export interface CartItem {
  ProductID: number;
  ProductName: string;
  PathImage: string | null;
  Unit: string;
  Price: number;
  /** Tồn kho tại thời điểm thêm / lần đồng bộ gần nhất */
  Stock: number;
  Quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty?: number) => boolean;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  /** Cập nhật giá / tồn kho mới nhất từ server */
  sync: (products: Product[]) => void;
  quantityOf: (id: number) => number;
}

const KEY = 'cart';
const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is CartItem => typeof x?.ProductID === 'number' && typeof x?.Quantity === 'number');
  } catch {
    return [];
  }
}

const clamp = (qty: number, stock: number) => Math.max(1, Math.min(Math.floor(qty) || 1, stock));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);
  // Đồng bộ giữa các tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setItems(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((p: Product, qty = 1): boolean => {
    const current = items.find((i) => i.ProductID === p.ProductID)?.Quantity ?? 0;
    if (p.Quantity <= 0) { toast.error('Sản phẩm đã hết hàng'); return false; }
    if (current + qty > p.Quantity) {
      toast.error(`Chỉ còn ${p.Quantity} ${p.Unit}${current ? `, giỏ hàng đã có ${current}` : ''}`);
      return false;
    }
    setItems((list) => {
      const base: CartItem = {
        ProductID: p.ProductID, ProductName: p.ProductName, PathImage: p.PathImage, Unit: p.Unit,
        Price: p.Price, Stock: p.Quantity, Quantity: qty,
      };
      const existing = list.find((i) => i.ProductID === p.ProductID);
      if (!existing) return [...list, base];
      return list.map((i) => (i.ProductID === p.ProductID ? { ...base, Quantity: i.Quantity + qty } : i));
    });
    toast.success(`Đã thêm "${p.ProductName}" vào giỏ`);
    return true;
  }, [items]);

  const setQty = useCallback((id: number, qty: number) => {
    setItems((list) => list.map((i) => {
      if (i.ProductID !== id) return i;
      if (qty > i.Stock) toast.error(`Chỉ còn ${i.Stock} ${i.Unit}`);
      return { ...i, Quantity: clamp(qty, i.Stock) };
    }));
  }, []);

  const remove = useCallback((id: number) => setItems((list) => list.filter((i) => i.ProductID !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const sync = useCallback((products: Product[]) => {
    setItems((list) => {
      let changed = false;
      const next = list.map((i) => {
        const p = products.find((x) => x.ProductID === i.ProductID);
        if (!p || (p.Price === i.Price && p.Quantity === i.Stock && p.ProductName === i.ProductName)) return i;
        changed = true;
        return { ...i, ProductName: p.ProductName, PathImage: p.PathImage, Price: p.Price, Stock: p.Quantity, Quantity: Math.min(i.Quantity, Math.max(p.Quantity, 0)) };
      });
      return changed ? next : list;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((s, i) => s + i.Quantity, 0),
    total: items.reduce((s, i) => s + i.Quantity * i.Price, 0),
    add, setQty, remove, clear, sync,
    quantityOf: (id) => items.find((i) => i.ProductID === id)?.Quantity ?? 0,
  }), [items, add, setQty, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải dùng bên trong CartProvider');
  return ctx;
}

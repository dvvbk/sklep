"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/gen/golden_fish/v1/users_pb";
import type { Cart } from "@/gen/golden_fish/v1/cart_pb";

interface AuthState {
  user: User | null;
  token: string | null;
  isAdminFlag: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

interface CartState {
  cart: Cart | null;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  itemCount: () => number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAdminFlag: false,
      setAuth: (user, token) => set({ user, token, isAdminFlag: !!user.isAdmin }),
      clearAuth: () => set({ user: null, token: null, isAdminFlag: false }),
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().isAdminFlag,
    }),
    {
      name: "zlota-rybka-auth",
      partialize: (state) => ({ token: state.token, isAdminFlag: state.isAdminFlag }),
    }
  )
);

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  setCart: (cart) => set({ cart }),
  clearCart: () => set({ cart: null }),
  itemCount: () => {
    const cart = get().cart;
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

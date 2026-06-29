import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CartItem } from "@food-delivery/types";

type NewCartItem = Omit<CartItem, "quantity">;

interface CartStore {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  totalPrice: number;
  addItem: (item: NewCartItem) => void;
  removeItem: (id: string) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  clearCart: () => void;
}

function sumTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      restaurantId: null,
      restaurantName: null,
      totalPrice: 0,

      addItem: (item) =>
        set((s) => {
          if (s.restaurantId && s.restaurantId !== item.restaurantId) {
            const items = [{ ...item, quantity: 1 }];
            return {
              items,
              restaurantId: item.restaurantId,
              restaurantName: item.restaurantName,
              totalPrice: sumTotal(items),
            };
          }

          const existing = s.items.find((i) => i.id === item.id);
          const items = existing
            ? s.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
              )
            : [...s.items, { ...item, quantity: 1 }];

          return {
            items,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            totalPrice: sumTotal(items),
          };
        }),

      removeItem: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.id !== id);
          return { items, totalPrice: sumTotal(items) };
        }),

      incrementItem: (id) =>
        set((s) => {
          const items = s.items.map((i) =>
            i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
          );
          return { items, totalPrice: sumTotal(items) };
        }),

      decrementItem: (id) =>
        set((s) => {
          const items = s.items
            .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0);
          return { items, totalPrice: sumTotal(items) };
        }),

      clearCart: () =>
        set({ items: [], restaurantId: null, restaurantName: null, totalPrice: 0 }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

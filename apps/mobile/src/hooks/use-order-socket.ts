import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Order } from "@food-delivery/types";
import { getToken } from "@/lib/auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:3000";

// Returns an incrementing counter so callers can `useEffect` off its change
// to know an order:created/order:updated event arrived for this restaurant.
export function useRestaurantSocket(restaurantId: string | null) {
  const [lastEvent, setLastEvent] = useState(0);

  useEffect(() => {
    if (!restaurantId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SERVER_URL}/orders`, { auth: { token } });
      socket.on("order:created", () => setLastEvent((n) => n + 1));
      socket.on("order:updated", () => setLastEvent((n) => n + 1));
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [restaurantId]);

  return lastEvent;
}

// Listens for order:updated events scoped to a single order — the gateway
// broadcasts every status change for the customer's orders to their own
// room, so this filters to the one the screen cares about.
export function useCustomerOrderSocket(orderId: string | null): Order | null {
  const [updatedOrder, setUpdatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SERVER_URL}/orders`, { auth: { token } });
      socket.on("order:updated", (order: Order) => {
        if (order.id === orderId) setUpdatedOrder(order);
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [orderId]);

  return updatedOrder;
}

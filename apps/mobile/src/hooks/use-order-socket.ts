import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Order } from "@food-delivery/types";
import { getToken } from "@/lib/auth";

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:3000";

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

// Driver receives order:assigned when driver-assignment.service.ts offers
// them an order — the screen shows an accept/decline modal off this.
export function useDriverAssignedSocket(driverId: string | null): Order | null {
  const [assignedOrder, setAssignedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!driverId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SERVER_URL}/orders`, { auth: { token } });
      socket.on("order:assigned", (order: Order) => setAssignedOrder(order));
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [driverId]);

  return assignedOrder;
}

// Driver -> Server GPS ping. Connects whenever `enabled` is true (online and
// idle, or mid-delivery — the server persists Driver.lat/lng either way so
// driver-assignment.service.ts's haversine search can find this driver, and
// also relays to the customer if this driver currently has a PICKED_UP
// order). The screen calls the returned function from its expo-location
// watch handler.
export function useDriverLocationBroadcaster(enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socketRef.current = io(`${SERVER_URL}/orders`, { auth: { token } });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return useCallback(
    (latitude: number, longitude: number, accuracy: "high" | "low" | "none") => {
      socketRef.current?.emit("driver:location:update", {
        latitude,
        longitude,
        accuracy,
      });
    },
    [],
  );
}

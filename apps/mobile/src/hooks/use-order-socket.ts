import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Order } from "@food-delivery/types";
import { getToken } from "@/lib/auth";

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:3000";

interface RestaurantSocketState {
  lastEvent: number;
  assignmentFailedOrderId: string | null;
}

// Returns event counter + the latest order that failed driver assignment.
export function useRestaurantSocket(restaurantId: string | null) {
  const [state, setState] = useState<RestaurantSocketState>({
    lastEvent: 0,
    assignmentFailedOrderId: null,
  });

  useEffect(() => {
    if (!restaurantId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SERVER_URL}/orders`, { auth: { token } });
      socket.on("order:created", () =>
        setState((s) => ({ ...s, lastEvent: s.lastEvent + 1 })),
      );
      socket.on("order:updated", () =>
        setState((s) => ({ ...s, lastEvent: s.lastEvent + 1 })),
      );
      // Fired when all MAX_ATTEMPTS exhausted with no driver accepting.
      socket.on("driver:assignment:failed", (order: Order) =>
        setState((s) => ({
          lastEvent: s.lastEvent + 1,
          assignmentFailedOrderId: order.id,
        })),
      );
      // Fired per-driver when 2-minute timeout lapses; triggers a refetch
      // so the owner sees the order is still searching.
      socket.on("driver:assignment:timeout", () =>
        setState((s) => ({ ...s, lastEvent: s.lastEvent + 1 })),
      );
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [restaurantId]);

  return state;
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
// Listens to driver:availability:changed broadcast from the server so customer
// screens update instantly when any driver goes online or offline — no polling.
export function useDeliveryAvailable(initialAvailable: boolean | undefined) {
  const [available, setAvailable] = useState<boolean | undefined>(
    initialAvailable,
  );

  useEffect(() => {
    startTransition(() => setAvailable(initialAvailable));
  }, [initialAvailable]);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = io(`${SERVER_URL}/orders`, { auth: { token } });
      socket.on(
        'driver:availability:changed',
        (data: { available: boolean }) => {
          setAvailable(data.available);
        },
      );
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return available;
}

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

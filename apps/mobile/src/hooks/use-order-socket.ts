import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
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

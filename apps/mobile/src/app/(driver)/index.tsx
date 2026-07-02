import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { router } from "expo-router";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/auth.store";
import { Order } from "@order-eats/types";
import {
  useDriverAssignedSocket,
  useDriverLocationBroadcaster,
} from "@/hooks/use-order-socket";

export default function DriverHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [dismissedOrderId, setDismissedOrderId] = useState<string | null>(
    null,
  );

  // fetch current online/offline state from GET /driver/status
  const { data: status, isLoading } = useQuery<{ isOnline: boolean }>({
    queryKey: ["driver-status"],
    queryFn: () =>
      api.get<{ isOnline: boolean }>("/driver/status").then((r) => r.data),
  });

  // flip isOnline on the server via PATCH /driver/online
  const { mutate: toggleOnline, isPending: toggling } = useMutation({
    mutationFn: () => api.patch("/driver/online"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["driver-status"] }),
    onError: (e: any) =>
      Alert.alert(
        "오류",
        e?.response?.data?.message ?? "온라인 상태를 변경할 수 없습니다",
      ),
  });

  // server pushes order:assigned when driver-assignment.service.ts offers us an order
  const assignedOrder = useDriverAssignedSocket(user?.id ?? null);

  // Polling fallback: if the socket event was missed (race condition on connect),
  // catch up by polling GET /driver/orders every 5s for any PENDING_DRIVER order.
  const { data: pendingOrder } = useQuery<Order | null>({
    queryKey: ["driver-pending-order"],
    queryFn: () =>
      api
        .get<Order[]>("/driver/orders")
        .then((r) => r.data.find((o) => o.status === "PENDING_DRIVER") ?? null),
    refetchInterval: 5000,
    enabled: !!user?.id,
  });

  // Merge socket event and polling result — whichever arrives first wins.
  const candidateOrder = assignedOrder ?? pendingOrder ?? null;
  const incomingOrder =
    candidateOrder && candidateOrder.id !== dismissedOrderId
      ? candidateOrder
      : null;

  const isOnline = status?.isOnline ?? false;

  // Broadcast GPS while online and idle — driver-assignment.service.ts can
  // only find this driver if Driver.lat/lng is recent. Stops automatically
  // once active.tsx takes over for an in-progress delivery (it broadcasts
  // its own way while a PICKED_UP order exists).
  const sendLocation = useDriverLocationBroadcaster(isOnline);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isOnline) {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();
      if (permission !== Location.PermissionStatus.GRANTED || cancelled) {
        return;
      }

      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 25 },
        (location) => {
          sendLocation(location.coords.latitude, location.coords.longitude, "high");
        },
      );
    })();

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [isOnline, sendLocation]);

  // driver declines → POST /driver/orders/:id/decline
  const { mutate: declineOrder } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/decline`),
    onSuccess: (_data, orderId) => setDismissedOrderId(orderId),
    onError: (e: any) =>
      Alert.alert(
        "오류",
        e?.response?.data?.message ?? "문제가 발생했습니다",
      ),
  });

  // driver accepts → POST /driver/orders/:id/accept → map page'ga o'tadi
  const { mutate: acceptOrder } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/accept`),
    onSuccess: (_data, orderId) => {
      setDismissedOrderId(orderId);
      queryClient.invalidateQueries({ queryKey: ["driver-orders"] });
      router.replace("/(driver)/active");
    },
    onError: (e: any) =>
      Alert.alert(
        "오류",
        e?.response?.data?.message ?? "문제가 발생했습니다",
      ),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0077CC" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>드라이버 대시보드</Text>

        {/* online/offline toggle card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {isOnline ? "🟢 온라인 상태" : "🔴 오프라인 상태"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={() => {
                toggleOnline();
              }}
              disabled={toggling}
              trackColor={{ false: "#FECACA", true: "#86EFAC" }}
              thumbColor={isOnline ? "#22C55E" : "#EF4444"}
            />
          </View>
          <Text style={styles.statusSubtext}>
            {isOnline
              ? "배달 요청을 받을 수 있습니다"
              : "온라인으로 전환하여 주문을 받으세요"}
          </Text>
        </View>
      </View>

      {/* incoming order modal — shown when order:assigned fires */}
      <Modal visible={!!incomingOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>🛵 새 배달 요청</Text>

            <View style={styles.orderDetails}>
              <Text style={styles.orderLabel}>주문 번호</Text>
              <Text style={styles.orderValue}>
                #{incomingOrder?.id.slice(0, 8).toUpperCase()}
              </Text>

              <Text style={styles.orderLabel}>배달 주소</Text>
              <Text style={styles.orderValue}>
                {incomingOrder?.deliveryAddress}
              </Text>

              <Text style={styles.orderLabel}>합계</Text>
              <Text style={styles.orderValue}>
                ₩{Math.round(incomingOrder?.totalPrice ?? 0).toLocaleString("ko-KR")}
              </Text>
            </View>

            <Pressable
              style={styles.acceptButton}
              onPress={() => {
                if (incomingOrder) acceptOrder(incomingOrder.id);
              }}
            >
              <Text style={styles.acceptButtonText}>수락</Text>
            </Pressable>

            <Pressable
              style={styles.declineButton}
              onPress={() => {
                if (incomingOrder) declineOrder(incomingOrder.id);
              }}
            >
              <Text style={styles.declineButtonText}>거절</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
  statusSubtext: {
    fontSize: 13,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  orderDetails: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  orderLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  orderValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  acceptButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  declineButton: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  declineButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
});

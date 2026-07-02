import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/axios";
import { Order } from "@order-eats/types";

type DriverOrder = Order & {
  restaurant: { id: string; name: string };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_DRIVER: "#06B6D4",
  PICKED_UP: "#0077CC",
  DELIVERED: "#22C55E",
  CANCELLED: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_DRIVER: "드라이버 배정 중",
  PICKED_UP: "픽업 완료",
  DELIVERED: "배달 완료",
  CANCELLED: "취소됨",
};

function DeliveryCard({
  order,
  onPress,
}: {
  order: DriverOrder;
  onPress?: () => void;
}) {
  const statusColor = STATUS_COLORS[order.status] ?? "#999";
  const date = new Date(order.createdAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isClickable =
    order.status === "PICKED_UP" || order.status === "PENDING_DRIVER";

  return (
    <Pressable
      style={[styles.card, isClickable && styles.cardActive]}
      onPress={onPress}
      disabled={!isClickable}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.restaurant}>{order.restaurant.name}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
      </View>
      <Text style={styles.address} numberOfLines={1}>
        📍 {order.deliveryAddress}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.total}>
          ₩{Math.round(order.totalPrice).toLocaleString("ko-KR")}
        </Text>
      </View>
      {order.status === "PICKED_UP" && (
        <Text style={styles.tapHint}>탭하여 배달 현황 보기 →</Text>
      )}
      {order.status === "PENDING_DRIVER" && (
        <Text style={styles.tapHint}>탭하여 주문 수락하기 →</Text>
      )}
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
  const { data: orders = [], isLoading } = useQuery<DriverOrder[]>({
    queryKey: ["driver-orders"],
    queryFn: () => api.get<DriverOrder[]>("/driver/orders").then((r) => r.data),
  });

  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const inProgressCount = orders.filter((o) =>
    ["PENDING_DRIVER", "PICKED_UP"].includes(o.status),
  ).length;

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
      <Text style={styles.title}>배달 내역</Text>

      {orders.length > 0 && (
        <View style={styles.summaryRow}>
          {inProgressCount > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValueLight}>{inProgressCount}</Text>
              <Text style={styles.summaryLabelLight}>진행 중</Text>
            </View>
          )}
          {deliveredCount > 0 && (
            <View style={[styles.summaryCard, styles.summaryCardMuted]}>
              <Text style={styles.summaryValue}>{deliveredCount}</Text>
              <Text style={styles.summaryLabel}>완료</Text>
            </View>
          )}
        </View>
      )}

      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>아직 배달 내역이 없습니다</Text>
          <Text style={styles.emptySubText}>
            배정된 주문이 여기에 표시됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DeliveryCard
              order={item}
              onPress={
                item.status === "PICKED_UP"
                  ? () => router.push("/(driver)/active")
                  : item.status === "PENDING_DRIVER"
                    ? () => router.push("/(driver)")
                    : undefined
              }
            />
          )}
        />
      )}
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
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#0077CC",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  summaryCardMuted: {
    backgroundColor: "#f0f0f0",
  },
  summaryValueLight: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  summaryLabelLight: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: "#0077CC",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restaurant: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 13,
    color: "#777",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  date: {
    fontSize: 12,
    color: "#aaa",
  },
  tapHint: {
    fontSize: 12,
    color: "#0077CC",
    fontWeight: "600",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

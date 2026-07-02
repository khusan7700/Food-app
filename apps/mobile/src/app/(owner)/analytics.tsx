import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { Order, Restaurant } from "@order-eats/types";

type RestaurantOrder = Order & { items: { id: string }[] };

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#3B82F6",
  PREPARING: "#8B5CF6",
  READY: "#06B6D4",
  PICKED_UP: "#0077CC",
  DELIVERED: "#22C55E",
  CANCELLED: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "결제 대기",
  CONFIRMED: "주문 확인됨",
  PREPARING: "준비 중",
  READY: "준비 완료",
  PENDING_DRIVER: "드라이버 배정 중",
  PICKED_UP: "픽업 완료",
  DELIVERED: "배달 완료",
  CANCELLED: "취소됨",
  REFUND_PENDING: "환불 대기",
  REFUNDED: "환불 완료",
};

function formatPrice(won: number) {
  return Math.round(won).toLocaleString("ko-KR");
}

export default function OwnerAnalyticsScreen() {
  const { data: restaurant, isLoading: restaurantLoading } =
    useQuery<Restaurant | null>({
      queryKey: ["my-restaurant"],
      queryFn: () =>
        api.get<Restaurant | null>("/restaurants/mine").then((r) => r.data),
    });

  const { data: allOrders = [], isLoading: ordersLoading } = useQuery<
    RestaurantOrder[]
  >({
    queryKey: ["restaurant-orders"],
    queryFn: () =>
      api.get<RestaurantOrder[]>("/orders/restaurant").then((r) => r.data),
    enabled: !!restaurant,
  });

  // filter to today's orders only — compared on the frontend
  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return allOrders.filter(
      (o) => new Date(o.createdAt).toDateString() === today,
    );
  }, [allOrders]);

  const totalRevenue = formatPrice(
    todayOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalPrice, 0),
  );
  const totalRevenueDisplay = `₩${totalRevenue}`;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return counts;
  }, [todayOrders]);

  const isLoading = restaurantLoading || ordersLoading;

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
      <Text style={styles.title}>오늘의 요약</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString("ko-KR", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>

      <View style={styles.revenueCard}>
        <View style={styles.revenueRow}>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueValue}>{todayOrders.length}</Text>
            <Text style={styles.revenueLabel}>주문 수</Text>
          </View>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueItem}>
            <Text style={styles.revenueValue}>{totalRevenueDisplay}</Text>
            <Text style={styles.revenueLabel}>매출</Text>
          </View>
        </View>
      </View>

      {Object.keys(statusCounts).length > 0 && (
        <View style={styles.statusBreakdown}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLORS[status] ?? "#999" },
                ]}
              />
              <Text style={styles.statusLabel}>{STATUS_LABELS[status] ?? status}</Text>
              <Text style={styles.statusCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {todayOrders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>오늘 주문이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={todayOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>
                  #{item.id.slice(0, 8).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        (STATUS_COLORS[item.status] ?? "#999") + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[item.status] ?? "#999" },
                    ]}
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderItems}>
                {item.items.length}개
              </Text>
              <Text style={styles.orderTotal}>
                ₩{formatPrice(item.totalPrice)}
              </Text>
            </View>
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
  },
  date: {
    fontSize: 14,
    color: "#999",
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 4,
  },
  revenueCard: {
    backgroundColor: "#f9f9f9",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  revenueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  revenueItem: {
    flex: 1,
    alignItems: "center",
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#333",
  },
  revenueLabel: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  revenueDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#e5e5e5",
  },
  statusBreakdown: {
    marginHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: "#555",
  },
  statusCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  orderCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
  orderItems: {
    fontSize: 13,
    color: "#777",
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});

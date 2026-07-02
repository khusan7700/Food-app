import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { Restaurant, Order } from "@order-eats/types";
import type { Payment } from "@order-eats/types";
import { useRestaurantSocket } from "@/hooks/use-order-socket";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#EAB308",
  CONFIRMED: "#3B82F6",
  PREPARING: "#F59E0B",
  READY: "#10B981",
  PENDING_DRIVER: "#6366F1",
  PICKED_UP: "#8B5CF6",
  DELIVERED: "#6B7280",
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

const TAB_BAR_OFFSET = 88;

export default function OwnerHomeScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const {
    data: restaurant,
    isLoading,
    isFetching,
  } = useQuery<Restaurant | null>({
    queryKey: ["my-restaurant"],
    queryFn: () =>
      api.get<Restaurant | null>("/restaurants/mine").then((res) => res.data),
  });

  const { lastEvent, assignmentFailedOrderId } = useRestaurantSocket(
    restaurant?.id ?? null,
  );

  useEffect(() => {
    if (lastEvent) {
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
    }
  }, [lastEvent, queryClient]);

  const {
    data: orders = [],
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ["restaurant-orders"],
    queryFn: () => api.get<Order[]>("/orders/restaurant").then((r) => r.data),
    enabled: !!restaurant,
  });

  const { mutate: toggleOpen } = useMutation({
    mutationFn: () =>
      api.patch(`/restaurants/${restaurant?.id}`, {
        isOpen: !restaurant?.isOpen,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] }),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] }),
    onError: (e: { response?: { data?: { message?: string } } }) =>
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "상태를 업데이트할 수 없습니다",
      ),
  });

  useEffect(() => {
    if (isLoading) return;
    if (!restaurant) {
      router.replace("/(owner)/(index)/create-restaurant");
    }
  }, [restaurant, isLoading, isFetching]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0077CC" />
      </View>
    );
  }

  const activeOrders = orders.filter((o) =>
    ["PENDING", "CONFIRMED", "PREPARING", "READY", "PENDING_DRIVER", "PICKED_UP"].includes(o.status),
  );

  const pastOrders = orders.filter((o) =>
    ["DELIVERED", "CANCELLED"].includes(o.status),
  );

  function renderActionButton(order: Order & { payment?: Payment | null }) {
    if (order.status === "PENDING") {
      const isPaid = order.payment?.status === "APPROVED";
      if (!isPaid) {
        return (
          <View style={styles.awaitingPayment}>
            <Text style={styles.awaitingPaymentText}>⏳ 결제 대기 중...</Text>
          </View>
        );
      }
      return (
        <Pressable
          style={[styles.actionButton, { backgroundColor: "#3B82F6" }]}
          onPress={() => updateStatus({ id: order.id, status: "CONFIRMED" })}
        >
          <Text style={styles.actionButtonText}>주문 확인</Text>
        </Pressable>
      );
    }
    if (order.status === "CONFIRMED") {
      return (
        <Pressable
          style={[styles.actionButton, { backgroundColor: "#F59E0B" }]}
          onPress={() => updateStatus({ id: order.id, status: "PREPARING" })}
        >
          <Text style={styles.actionButtonText}>준비 시작</Text>
        </Pressable>
      );
    }
    if (order.status === "PREPARING") {
      return (
        <Pressable
          style={[styles.actionButton, { backgroundColor: "#10B981" }]}
          onPress={() => updateStatus({ id: order.id, status: "READY" })}
        >
          <Text style={styles.actionButtonText}>준비 완료</Text>
        </Pressable>
      );
    }
    if (order.status === "PENDING_DRIVER") {
      const failed = assignmentFailedOrderId === order.id;
      return (
        <View
          style={[
            styles.searchingCard,
            { backgroundColor: failed ? "#FEE2E2" : "#EEF2FF" },
          ]}
        >
          {failed ? (
            <Text style={styles.searchingIcon}>❌</Text>
          ) : (
            <ActivityIndicator size="small" color="#6366F1" />
          )}
          <Text
            style={[
              styles.searchingText,
              { color: failed ? "#DC2626" : "#6366F1" },
            ]}
          >
            {failed
              ? "가능한 드라이버 없음. 재시도 중..."
              : "드라이버 검색 중......"}
          </Text>
        </View>
      );
    }
    if (order.status === "PICKED_UP") {
      return (
        <View style={styles.pickedUpCard}>
          <Text style={styles.pickedUpText}>🛵 픽업 완료 — 배달 중</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topSection}>
        <View style={styles.header}>
          {restaurant?.imageUrl ? (
            <Image
              source={{ uri: restaurant.imageUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}

          <Text style={styles.name} numberOfLines={1}>
            {restaurant?.name}
          </Text>

          <Pressable
            style={[
              styles.toggleButton,
              restaurant?.isOpen ? styles.open : styles.closed,
            ]}
            onPress={() => toggleOpen()}
          >
            <Text style={styles.toggleText}>
              {restaurant?.isOpen ? "영업중" : "영업종료"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() => router.push("/(owner)/(index)/edit-restaurant")}
        >
          <Text style={styles.editButtonText}>음식점 수정</Text>
        </Pressable>

        <FlatList
          style={styles.list}
          data={activeOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + TAB_BAR_OFFSET },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={void refetch}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>진행 중인 주문 없음</Text>
            </View>
          }
          ListHeaderComponent={
            activeOrders.length > 0 ? (
              <Text style={styles.sectionTitle}>
                진행 중 ({activeOrders.length})
              </Text>
            ) : null
          }
          ListFooterComponent={
            pastOrders.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>지난 주문</Text>
                {pastOrders.slice(0, 5).map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: STATUS_COLORS[order.status] + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: STATUS_COLORS[order.status] },
                          ]}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.orderTotal}>₩{formatPrice(order.totalPrice)}</Text>
                    <Text style={styles.orderAddress} numberOfLines={1}>
                      {order.deliveryAddress}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item: order }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>
                  #{order.id.slice(0, 8).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[order.status] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[order.status] },
                    ]}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderTotal}>₩{formatPrice(order.totalPrice)}</Text>
              <Text style={styles.orderAddress} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
              {renderActionButton(order)}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topSection: {
    flex: 1,
    width: "100%",
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#eee",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  toggleButton: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  open: {
    backgroundColor: "#22C55E",
  },
  closed: {
    backgroundColor: "#EF4444",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  editButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  list: {
    flex: 1,
    width: "100%",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    marginBottom: 12,
    gap: 6,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0077CC",
  },
  orderAddress: {
    fontSize: 13,
    color: "#666",
  },
  actionButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  awaitingPayment: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
  },
  awaitingPaymentText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
  },
  pickedUpCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
  },
  pickedUpText: {
    fontSize: 13,
    color: "#065F46",
    fontWeight: "600",
  },
  searchingCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchingIcon: {
    fontSize: 16,
  },
  searchingText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

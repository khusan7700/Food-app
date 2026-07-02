import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/axios";
import { Order } from "@order-eats/types";

type WaitOrder = Order & { restaurant: { id: string; name: string; address: string } };

function formatPrice(won: number) {
  return Math.round(won).toLocaleString("ko-KR");
}

export default function WaitingOrdersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<WaitOrder[]>({
    queryKey: ["driver-waiting-orders"],
    queryFn: () =>
      api.get<WaitOrder[]>("/driver/waiting-orders").then((r) => r.data),
    refetchInterval: 10_000,
  });

  const { mutate: claimOrder } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/claim`),
    onMutate: (orderId) => setClaimingId(orderId),
    onSettled: () => setClaimingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-orders"] });
      queryClient.invalidateQueries({ queryKey: ["driver-waiting-orders"] });
      router.replace("/(driver)/active");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      Alert.alert(
        "수락 불가",
        e.response?.data?.message ?? "이미 다른 기사가 수락했을 수 있습니다",
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
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 88 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>대기 주문</Text>
            <Text style={styles.subtitle}>
              {orders.length > 0
                ? `배달기사를 기다리는 주문 ${orders.length}건`
                : "대기 중인 주문 없음"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>대기 주문 없음</Text>
            <Text style={styles.emptySubText}>
              배달기사가 없는 주문이 여기에 표시됩니다
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>
                #{item.id.slice(0, 8).toUpperCase()}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>대기중</Text>
              </View>
            </View>

            <Text style={styles.restaurant}>🍽 {item.restaurant.name}</Text>
            <Text style={styles.address} numberOfLines={1}>
              📍 {item.deliveryAddress}
            </Text>
            <Text style={styles.price}>₩{formatPrice(item.totalPrice)}</Text>

            <Pressable
              style={[
                styles.acceptButton,
                claimingId === item.id && styles.acceptButtonDisabled,
              ]}
              onPress={() => claimOrder(item.id)}
              disabled={claimingId !== null}
            >
              {claimingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>주문 수락</Text>
              )}
            </Pressable>
          </View>
        )}
      />
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
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 64,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    gap: 6,
    backgroundColor: "#FAFAFA",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  badge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  restaurant: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: "#666",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0077CC",
  },
  acceptButton: {
    marginTop: 10,
    backgroundColor: "#6366F1",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

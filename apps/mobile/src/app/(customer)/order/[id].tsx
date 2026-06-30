import { startTransition, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { Order, PaymentStatus } from "@food-delivery/types";
import { useCustomerOrderSocket } from "@/hooks/use-order-socket";
import { RatingModal } from "@/components/rating-modal";

type OrderDetail = Order & {
  restaurant: { id: string; name: string };
  items: { id: string; quantity: number; price: number }[];
  payment: { status: PaymentStatus } | null;
};

function formatPrice(cents: number) {
  return (cents / 100).toFixed(2);
}

const STATUS_STEPS = [
  { key: "CONFIRMED", label: "Order Confirmed", icon: "✅" },
  { key: "PREPARING", label: "Being Prepared", icon: "👨‍🍳" },
  { key: "READY", label: "Ready for Pickup", icon: "📦" },
  { key: "PENDING_DRIVER", label: "Finding a Driver", icon: "🔎" },
  { key: "PICKED_UP", label: "On the Way", icon: "🛵" },
  { key: "DELIVERED", label: "Delivered", icon: "🎉" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const orderUpdate = useCustomerOrderSocket(id ?? null);

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["order", id],
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: reviewStatus } = useQuery<{ reviewed: boolean }>({
    queryKey: ["review-status", id],
    queryFn: () =>
      api.get<{ reviewed: boolean }>(`/reviews/order/${id}/status`).then((r) => r.data),
    enabled: !!id,
  });

  // reviewStatus undefined = still loading; don't open modal until we know for sure.
  const reviewStatusLoaded = reviewStatus !== undefined;
  const alreadyReviewed = reviewStatus?.reviewed ?? false;

  useEffect(() => {
    if (orderUpdate) {
      queryClient.setQueryData(["order", id], orderUpdate);
      if (orderUpdate.status === "DELIVERED" && reviewStatusLoaded && !alreadyReviewed) {
        startTransition(() => setShowRating(true));
      }
    }
  }, [orderUpdate, id, queryClient, alreadyReviewed, reviewStatusLoaded]);

  // Show modal when both order (DELIVERED) and review status are loaded.
  useEffect(() => {
    if (order?.status === "DELIVERED" && reviewStatusLoaded && !alreadyReviewed) {
      startTransition(() => setShowRating(true));
    }
  }, [order?.status, alreadyReviewed, reviewStatusLoaded]);

  // If reviewStatus arrives and user already reviewed — force-close the modal.
  useEffect(() => {
    if (alreadyReviewed) {
      startTransition(() => setShowRating(false));
    }
  }, [alreadyReviewed]);

  const { mutate: submitReview, isPending: isSubmittingReview } = useMutation({
    mutationFn: (data: {
      restaurantRating: number;
      driverRating?: number;
      comment?: string;
    }) =>
      api.post("/reviews", { orderId: id, ...data }),
    onSuccess: () => {
      setShowRating(false);
      queryClient.setQueryData(["review-status", id], { reviewed: true });
    },
    onError: () => {
      setShowRating(false);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order?.status ?? "");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          {order?.restaurant?.name} is getting started on your order
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>{order?.id.slice(0, 8).toUpperCase()}</Text>

          <Text style={styles.label}>Total</Text>
          <Text style={styles.value}>
            ${order ? formatPrice(order.totalPrice) : "0.00"}
          </Text>

          <Text style={styles.label}>Delivery to</Text>
          <Text style={styles.value}>{order?.deliveryAddress}</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.statusValue}>{order?.status}</Text>
        </View>

        {order?.status === "PENDING" && order.payment?.status !== "APPROVED" ? (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentText}>
              {order.payment?.status === "FAILED" ||
              order.payment?.status === "CANCELLED"
                ? "Your Kakao Pay payment didn't go through."
                : "Waiting for Kakao Pay payment."}
            </Text>
            <Pressable
              style={styles.payButton}
              onPress={() => router.push(`/(customer)/payment/${order.id}`)}
            >
              <Text style={styles.payButtonText}>Pay with Kakao Pay</Text>
            </Pressable>
          </View>
        ) : null}

        {order?.status === "CANCELLED" ? (
          <View style={styles.cancelledBox}>
            <Text style={styles.cancelledText}>❌ Order Cancelled</Text>
          </View>
        ) : (
          <View style={styles.tracker}>
            <Text style={styles.trackerTitle}>Order Progress</Text>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentIndex;
              const isActive = index === currentIndex;
              return (
                <View key={step.key} style={styles.step}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepCircle,
                        isCompleted && styles.stepCircleCompleted,
                        isActive && styles.stepCircleActive,
                      ]}
                    >
                      <Text style={styles.stepIcon}>
                        {isCompleted ? step.icon : "○"}
                      </Text>
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          isCompleted && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isCompleted && styles.stepLabelCompleted,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {order?.status === "DELIVERED" && (
          <View style={styles.deliveredBanner}>
            <Text style={styles.deliveredEmoji}>🎉</Text>
            <Text style={styles.deliveredTitle}>Delivered!</Text>
            <Text style={styles.deliveredSub}>
              Your order has arrived. Enjoy your meal!
            </Text>
            {alreadyReviewed ? (
              <Text style={styles.reviewedText}>✅ Review submitted</Text>
            ) : (
              <Pressable
                style={styles.rateButton}
                onPress={() => setShowRating(true)}
              >
                <Text style={styles.rateButtonText}>⭐ Rate your order</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable
          style={styles.homeButton}
          onPress={() => router.replace("/(customer)/(tabs)/(home)")}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>

      <RatingModal
        visible={showRating}
        hasDriver={!!order?.driverId}
        onSubmit={submitReview}
        onDismiss={() => setShowRating(false)}
        isSubmitting={isSubmittingReview}
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
  content: {
    padding: 24,
    alignItems: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 20,
    gap: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6B35",
  },
  homeButton: {
    borderRadius: 8,
    padding: 16,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deliveredBanner: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
    gap: 8,
  },
  deliveredEmoji: {
    fontSize: 48,
  },
  deliveredTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#16A34A",
  },
  deliveredSub: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  rateButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  rateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  reviewedText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 8,
  },
  trackerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#333",
    alignSelf: "flex-start",
  },
  cancelledBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  cancelledText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  paymentBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
    gap: 12,
  },
  paymentText: {
    fontSize: 14,
    color: "#92400E",
    textAlign: "center",
  },
  payButton: {
    backgroundColor: "#FEE500",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#191919",
  },
  tracker: {
    marginBottom: 24,
    width: "100%",
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepLeft: {
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleCompleted: {
    backgroundColor: "#DCFCE7",
  },
  stepCircleActive: {
    backgroundColor: "#FF6B35",
  },
  stepIcon: {
    fontSize: 16,
  },
  stepLine: {
    width: 2,
    height: 32,
    backgroundColor: "#f0f0f0",
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: "#22C55E",
  },
  stepLabel: {
    fontSize: 15,
    color: "#999",
    paddingTop: 10,
  },
  stepLabelActive: {
    color: "#FF6B35",
    fontWeight: "700",
  },
  stepLabelCompleted: {
    color: "#333",
    fontWeight: "500",
  },
});

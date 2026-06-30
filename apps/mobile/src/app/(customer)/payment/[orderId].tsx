import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { WebView, WebViewNavigation } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { Order } from "@food-delivery/types";

export default function KakaoPayScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [resolved, setResolved] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [kakaoOpened, setKakaoOpened] = useState(false);
  const resolvedRef = useRef(false);

  // useMutation — POST is a mutation, not a query. useQuery for POST causes
  // silent duplicate calls on every refetch (window focus, remount, etc.).
  const { mutate: startPayment, isPending, isError } = useMutation({
    mutationFn: () =>
      api
        .post<{ redirectUrl: string }>("/payments/kakao/ready", { orderId })
        .then((res) => res.data),
    onSuccess: (data) => setRedirectUrl(data.redirectUrl),
  });

  // Trigger once on mount — orderId is stable for the lifetime of this screen.
  useEffect(() => {
    if (orderId) startPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Web only: poll for payment approval after user opens Kakao Pay in a new tab.
  // Stops as soon as payment is APPROVED (or if already resolved).
  useQuery<Order & { payment?: { status: string } | null }>({
    queryKey: ["payment-poll", orderId],
    queryFn: () =>
      api.get<Order & { payment?: { status: string } | null }>(`/orders/${orderId}`)
        .then((r) => r.data),
    enabled: Platform.OS === "web" && kakaoOpened && !resolved,
    refetchInterval: 3000,
    select: (data) => {
      if (data?.payment?.status === "APPROVED" && !resolvedRef.current) {
        resolvedRef.current = true;
        setResolved(true);
        router.replace(`/(customer)/order/${orderId}`);
      }
      return data;
    },
  });

  function finishWith(message: string) {
    if (resolved) return;
    setResolved(true);
    Alert.alert("Kakao Pay", message, [
      {
        text: "OK",
        onPress: () => router.replace(`/(customer)/order/${orderId}`),
      },
    ]);
  }

  // Dev-only shortcut to skip the real Kakao Pay redirect while testing the
  // rest of the order flow. The backend rejects this outside of dev anyway,
  // but it's also hidden from the UI in production builds. Unlike the real
  // approve/cancel/fail paths, this jumps straight to the order screen with
  // no confirmation alert — it's a fast dev tool, not a user-facing result.
  const { mutate: testApprove, isPending: isTestApproving } = useMutation({
    mutationFn: () =>
      api.post("/payments/kakao/test-approve", { orderId }).then((r) => r.data),
    onSuccess: () => {
      if (resolved) return;
      setResolved(true);
      router.replace(`/(customer)/order/${orderId}`);
    },
    onError: () => Alert.alert("Error", "Could not mark as paid."),
  });

  function renderTestApproveButton(inline: boolean) {
    if (!__DEV__) return null;
    return (
      <Pressable
        style={inline ? styles.testButtonInline : styles.testButton}
        onPress={() => testApprove()}
        disabled={isTestApproving}
      >
        <Text style={styles.testButtonText}>
          {isTestApproving ? "..." : "🧪 Test: Mark as Paid"}
        </Text>
      </Pressable>
    );
  }

  function handleNavigationChange(navState: WebViewNavigation) {
    if (navState.url.includes("/payments/kakao/approve")) {
      finishWith("Payment successful!");
    } else if (navState.url.includes("/payments/kakao/cancel")) {
      finishWith("Payment was cancelled.");
    } else if (navState.url.includes("/payments/kakao/fail")) {
      finishWith("Payment failed. Please try again.");
    }
  }

  if (isPending || !redirectUrl) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Starting Kakao Pay...</Text>
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.errorText}>Could not start Kakao Pay payment.</Text>
        <Pressable style={styles.retryButton} onPress={() => startPayment()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  // react-native-webview has no web implementation, so on web there's no
  // embedded bridge page. Kakao Pay opens in a NEW TAB so this screen stays
  // alive and polls for APPROVED status every 3s — navigating automatically
  // once the backend confirms the payment.
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        {kakaoOpened ? (
          <>
            <ActivityIndicator size="large" color="#FEE500" />
            <Text style={[styles.loadingText, { marginTop: 12 }]}>
              Kakao Pay{"'"}da to{"'"}lovni amalga oshiring...
            </Text>
            <Text style={styles.subText}>
              To{"'"}lov tugagandan keyin bu sahifa avtomatik yangilanadi.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.loadingText}>Kakao Pay orqali to{"'"}lash.</Text>
            <Pressable
              style={styles.kakaoButton}
              onPress={() => {
                window.open(redirectUrl, "_blank");
                setKakaoOpened(true);
              }}
            >
              <Text style={styles.kakaoButtonText}>눌러서 열기</Text>
            </Pressable>
          </>
        )}
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <WebView
        source={{ uri: redirectUrl }}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        )}
      />
      {renderTestApproveButton(false)}
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
    backgroundColor: "#fff",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  subText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  kakaoButton: {
    backgroundColor: "#FEE500",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  kakaoButtonText: {
    color: "#191919",
    fontSize: 16,
    fontWeight: "700",
  },
  testButton: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: "#191919",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  testButtonInline: {
    backgroundColor: "#191919",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

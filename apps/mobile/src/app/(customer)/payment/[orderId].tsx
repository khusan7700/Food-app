import { useState } from "react";
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

export default function KakaoPayScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [resolved, setResolved] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["kakao-pay-ready", orderId],
    queryFn: () =>
      api
        .post<{ redirectUrl: string }>("/payments/kakao/ready", { orderId })
        .then((res) => res.data),
    enabled: !!orderId,
  });

  function finishWith(message: string) {
    if (resolved) return;
    setResolved(true);
    Alert.alert("Kakao Pay", message, [
      {
        text: "OK",
        onPress: () =>
          router.replace(`/(customer)/order/${orderId}`),
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Starting Kakao Pay...</Text>
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  if (error || !data?.redirectUrl) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.errorText}>Could not start Kakao Pay payment.</Text>
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  // react-native-webview has no web implementation, so on web there's no
  // embedded bridge page — just a plain link to Kakao Pay's hosted page,
  // with the dev test button stacked underneath it.
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.loadingText}>Ready to pay with Kakao Pay.</Text>
        <Pressable
          style={styles.kakaoButton}
          onPress={() => {
            window.location.href = data.redirectUrl;
          }}
        >
          <Text style={styles.kakaoButtonText}>눌러서 열기</Text>
        </Pressable>
        {renderTestApproveButton(true)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <WebView
        source={{ uri: data.redirectUrl }}
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
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    paddingHorizontal: 24,
    textAlign: "center",
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

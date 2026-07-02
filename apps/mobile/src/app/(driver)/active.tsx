import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { api } from "@/lib/axios";
import { useDriverLocationBroadcaster } from "@/hooks/use-order-socket";
import KakaoMap, { KakaoMapHandle } from "@/components/KakaoMap";
import { Order } from "@order-eats/types";

type DriverOrder = Order & { restaurant: { id: string; name: string } };

type LocationError =
  | "services_disabled"
  | "permission_denied"
  | "timeout"
  | null;

export default function DriverActiveScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_OFFSET = 88;

  const queryClient = useQueryClient();
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<KakaoMapHandle>(null);
  const [driverPosition, setDriverPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<LocationError>(null);

  const { data: orders = [], isLoading } = useQuery<DriverOrder[]>({
    queryKey: ["driver-orders"],
    queryFn: () => api.get<DriverOrder[]>("/driver/orders").then((r) => r.data),
  });

  const activeOrder =
    orders.find((o) => o.status === "PICKED_UP") ?? null;

  const sendLocation = useDriverLocationBroadcaster(!!activeOrder);

  const { mutate: markDelivered, isPending } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/deliver`),
    onSuccess: () => {
      stopTracking();
      queryClient.invalidateQueries({ queryKey: ["driver-orders"] });
      Alert.alert(
        "🎉 배달 완료!",
        "배달이 완료되었습니다. 수고하셨습니다!",
        [{ text: "확인", onPress: () => router.replace("/(driver)") }],
      );
    },
    onError: (e: any) =>
      Alert.alert(
        "오류",
        e?.response?.data?.message ?? "문제가 발생했습니다",
      ),
  });

  async function startTracking() {
    setLocationError(null);

    // 1. Location services yoniqmi?
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      setLocationError("services_disabled");
      return;
    }

    // 2. Permission so'rash
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      setLocationError("permission_denied");
      return;
    }

    // 3. Cached location — GPS so'ramasdan darhol qaytaradi (simulatorda ham ishlaydi)
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        const { latitude, longitude } = last.coords;
        setDriverPosition({ latitude, longitude });
        sendLocation(latitude, longitude, "low");
      }
    } catch {
      // ignore
    }

    // 4. 3 soniyadan keyin hali ham pozitsiya yo'q bo'lsa — Seoul default
    const fallback = setTimeout(() => {
      setDriverPosition((prev) => {
        if (prev) return prev;
        return { latitude: 37.5665, longitude: 126.9780 };
      });
    }, 3000);

    // 5. Real-time kuzatish — Low accuracy = tezroq birinchi signal
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Low, timeInterval: 2000, distanceInterval: 10 },
      (loc) => {
        clearTimeout(fallback);
        const { latitude, longitude } = loc.coords;
        sendLocation(latitude, longitude, "high");
        setDriverPosition((prev) => {
          if (prev) return prev;
          return { latitude, longitude };
        });
        mapRef.current?.updateMarker(latitude, longitude);
      },
    );
  }

  function stopTracking() {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
  }

  useEffect(() => {
    void startTracking();
    return () => stopTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openLocationSettings() {
    if (Platform.OS === "ios") {
      void Linking.openURL("app-settings:");
    } else {
      void Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
    }
  }

  if (locationError === "services_disabled") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.gpsIcon}>📍</Text>
          <Text style={styles.gpsTitle}>GPS가 꺼져 있습니다</Text>
          <Text style={styles.gpsSub}>
            배달을 위해 기기의{"\n"}
            위치 서비스(GPS)를 켜주세요.
          </Text>
          <Pressable style={styles.settingsBtn} onPress={openLocationSettings}>
            <Text style={styles.settingsBtnText}>설정 열기</Text>
          </Pressable>
          <Pressable style={styles.retryLink} onPress={() => void startTracking()}>
            <Text style={styles.retryLinkText}>다시 확인</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError === "permission_denied") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.gpsIcon}>🔒</Text>
          <Text style={styles.gpsTitle}>위치 권한 없음</Text>
          <Text style={styles.gpsSub}>
            설정 → 앱 → 위치에서{"\n"}
            권한을 허용해 주세요.
          </Text>
          <Pressable style={styles.settingsBtn} onPress={openLocationSettings}>
            <Text style={styles.settingsBtnText}>설정 열기</Text>
          </Pressable>
          <Pressable style={styles.retryLink} onPress={() => void startTracking()}>
            <Text style={styles.retryLinkText}>다시 확인</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0077CC" />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>진행 중인 배달 없음</Text>
          <Text style={styles.emptySubText}>
            홈에서 주문을 수락하거나, 내역에서 픽업된 주문을 탭하세요
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_OFFSET },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>배달 중</Text>

        <View style={styles.mapWrapper}>
          {driverPosition ? (
            <KakaoMap
              ref={mapRef}
              latitude={driverPosition.latitude}
              longitude={driverPosition.longitude}
              markerTitle="나"
            />
          ) : locationError ? (
            <View style={styles.mapError}>
              <Text style={styles.mapErrorTitle}>
                {locationError === "services_disabled"
                  ? "위치 서비스 꺼짐"
                  : locationError === "permission_denied"
                    ? "위치 권한 없음"
                    : "위치를 찾을 수 없음"}
              </Text>
              <Text style={styles.mapErrorSub}>
                {locationError === "services_disabled"
                  ? "배달을 계속하려면 설정에서 위치 서비스를 켜주세요."
                  : locationError === "permission_denied"
                    ? "설정 → 앱 → 위치에서 접근을 허용해 주세요."
                    : "위치를 가져올 수 없습니다. 다시 시도해 주세요."}
              </Text>
              <Pressable style={styles.retryBtn} onPress={() => void startTracking()}>
                <Text style={styles.retryBtnText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="large" color="#0077CC" />
              <Text style={styles.mapPlaceholderText}>위치 찾는 중...</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>음식점</Text>
          <Text style={styles.value}>{activeOrder.restaurant.name}</Text>

          <Text style={styles.label}>주문 번호</Text>
          <Text style={styles.value}>
            #{activeOrder.id.slice(0, 8).toUpperCase()}
          </Text>

          <Text style={styles.label}>배달 주소</Text>
          <Text style={styles.value}>{activeOrder.deliveryAddress}</Text>
        </View>

        <Pressable
          style={styles.deliveredButton}
          onPress={() => markDelivered(activeOrder.id)}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deliveredButtonText}>배달 완료</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
    gap: 6,
    marginBottom: 16,
  },
  mapWrapper: {
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 220,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: "#999",
  },
  gpsIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  gpsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  gpsSub: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  settingsBtn: {
    backgroundColor: "#0077CC",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginBottom: 12,
  },
  settingsBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  retryLink: {
    paddingVertical: 8,
  },
  retryLinkText: {
    color: "#0077CC",
    fontSize: 14,
    fontWeight: "600",
  },
  mapError: {
    height: 220,
    borderRadius: 12,
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  mapErrorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },
  mapErrorSub: {
    fontSize: 13,
    color: "#991b1b",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#0077CC",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  deliveredButton: {
    backgroundColor: "#0077CC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  deliveredButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

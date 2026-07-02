import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Image,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Location from "expo-location";
import { api } from "@/lib/axios";
import { pickAndUploadImage } from "@/lib/upload";
import { Restaurant } from "@order-eats/types";

export default function CreateRestaurantScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const { mutate: createRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api
        .post<Restaurant>("/restaurants", {
          name,
          description,
          address,
          cuisineType,
          imageUrl: imageUrl ?? undefined,
          lat,
          lng,
        })
        .then((res) => res.data),
    onSuccess: (restaurant) => {
      void queryClient.setQueryData(["my-restaurant"], restaurant);
      router.replace("/(owner)/(index)");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "문제가 발생했습니다",
      );
    },
  });

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "권한 거부됨",
          "음식점 좌표를 설정하려면 위치 권한이 필요합니다.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);
    } catch {
      Alert.alert("오류", "현재 위치를 가져올 수 없습니다.");
    } finally {
      setIsLocating(false);
    }
  }

  const { mutate: geocodeAddress, isPending: isGeocoding } = useMutation({
    mutationFn: () =>
      api
        .get<{ lat: number; lng: number }>("/restaurants/geocode", {
          params: { address },
        })
        .then((res) => res.data),
    onSuccess: (coords) => {
      setLat(coords.lat);
      setLng(coords.lng);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "해당 주소를 찾을 수 없습니다",
      );
    },
  });

  async function handlePickImage() {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage("restaurant", (localUri) =>
        setImagePreview(localUri),
      );
      if (url) setImageUrl(url);
    } catch {
      Alert.alert("업로드 실패", "이미지를 업로드할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setImagePreview(null);
      setIsUploading(false);
    }
  }

  const displayedImage = imagePreview ?? imageUrl;

  function handleSubmit() {
    if (!name || !address || !cuisineType) {
      return Alert.alert("필수 항목을 모두 입력해 주세요");
    }
    if (lat === null || lng === null) {
      return Alert.alert(
        "위치 필요",
        "현재 위치 또는 주소 검색으로 음식점 위치를 설정하세요 — 위치 없이는 드라이버를 배정할 수 없습니다.",
      );
    }
    createRestaurant();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>음식점 등록</Text>

      <Pressable
        style={styles.imagePicker}
        onPress={() => {
          void handlePickImage();
        }}
        disabled={isUploading}
      >
        {displayedImage ? (
          <Image source={{ uri: displayedImage }} style={styles.image} />
        ) : (
          <Text style={styles.imagePickerText}>
            {isUploading ? "업로드 중..." : "탭하여 음식점 이미지 업로드"}
          </Text>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="음식점 이름 *"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="설명"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
      <TextInput
        style={styles.input}
        placeholder="주소 *"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="요리 종류 * (예: 한식, 중식)"
        value={cuisineType}
        onChangeText={setCuisineType}
      />

      <Text style={styles.sectionLabel}>위치 *</Text>
      <Text style={styles.sectionHint}>
        드라이버는 거리 기준으로 배정됩니다 — 정확하게 입력해 주세요.
      </Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          void handleUseCurrentLocation();
        }}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color="#0077CC" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            📍 현재 위치 사용
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          if (!address) {
            return Alert.alert("먼저 주소를 입력해 주세요");
          }
          geocodeAddress();
        }}
        disabled={isGeocoding}
      >
        {isGeocoding ? (
          <ActivityIndicator color="#0077CC" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            🔍 주소로 좌표 찾기
          </Text>
        )}
      </Pressable>

      {lat !== null && lng !== null ? (
        <Text style={styles.coordsText}>
          ✅ Location set: {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.coordsTextMissing}>아직 위치가 설정되지 않았습니다</Text>
      )}

      <Pressable
        style={styles.button}
        onPress={() => {
          handleSubmit();
        }}
        disabled={isPending || isUploading}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>음식점 등록</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  imagePicker: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imagePickerText: { color: "#999", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0077CC",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  sectionHint: { fontSize: 12, color: "#999", marginBottom: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0077CC",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: { color: "#0077CC", fontSize: 15, fontWeight: "600" },
  coordsText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  coordsTextMissing: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 16,
  },
});

import { useEffect, useReducer, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Location from "expo-location";
import { api } from "@/lib/axios";
import { pickAndUploadImage } from "@/lib/upload";
import { Restaurant } from "@order-eats/types";

interface FormState {
  loadedId: string | null;
  name: string;
  description: string;
  address: string;
  cuisineType: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
}

const initialForm: FormState = {
  loadedId: null,
  name: "",
  description: "",
  address: "",
  cuisineType: "",
  imageUrl: null,
  lat: null,
  lng: null,
};

type FormAction =
  | { type: "LOAD"; restaurant: Restaurant }
  | { type: "SET"; field: keyof FormState; value: FormState[keyof FormState] };

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === "LOAD") {
    return {
      loadedId: action.restaurant.id,
      name: action.restaurant.name,
      description: action.restaurant.description ?? "",
      address: action.restaurant.address,
      cuisineType: action.restaurant.cuisineType,
      imageUrl: action.restaurant.imageUrl ?? null,
      lat: action.restaurant.lat,
      lng: action.restaurant.lng,
    };
  }
  return { ...state, [action.field]: action.value };
}

export default function EditRestaurantScreen() {
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["my-restaurant"],
    queryFn: () =>
      api.get<Restaurant | null>("/restaurants/mine").then((res) => res.data),
  });

  useEffect(() => {
    if (restaurant && restaurant.id !== form.loadedId) {
      dispatch({ type: "LOAD", restaurant });
    }
  }, [restaurant?.id]);

  const { mutate: updateRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/restaurants/${restaurant?.id}`, {
        name: form.name,
        description: form.description,
        address: form.address,
        cuisineType: form.cuisineType,
        imageUrl: form.imageUrl ?? undefined,
        lat: form.lat,
        lng: form.lng,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] });
      router.replace("/(owner)/(index)");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert("오류", e.response?.data?.message ?? "문제가 발생했습니다");
    },
  });

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert("권한 거부됨", "위치 권한이 필요합니다.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      dispatch({ type: "SET", field: "lat", value: position.coords.latitude });
      dispatch({ type: "SET", field: "lng", value: position.coords.longitude });
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
          params: { address: form.address },
        })
        .then((res) => res.data),
    onSuccess: (coords) => {
      dispatch({ type: "SET", field: "lat", value: coords.lat });
      dispatch({ type: "SET", field: "lng", value: coords.lng });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert("오류", e.response?.data?.message ?? "해당 주소를 찾을 수 없습니다");
    },
  });

  async function handlePickImage() {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage("restaurant", (localUri) =>
        setImagePreview(localUri),
      );
      if (url) dispatch({ type: "SET", field: "imageUrl", value: url });
    } catch {
      Alert.alert("업로드 실패", "이미지를 업로드할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setImagePreview(null);
      setIsUploading(false);
    }
  }

  function handleSubmit() {
    if (form.lat === null || form.lng === null) {
      return Alert.alert(
        "위치 필요",
        "음식점 위치를 설정하세요 — 위치 없이는 드라이버를 배정할 수 없습니다.",
      );
    }
    updateRestaurant();
  }

  const displayedImage = imagePreview ?? form.imageUrl;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>음식점 수정</Text>

      <Pressable
        style={styles.imagePicker}
        onPress={() => { void handlePickImage(); }}
        disabled={isUploading}
      >
        {displayedImage ? (
          <Image source={{ uri: displayedImage }} style={styles.image} />
        ) : (
          <Text style={styles.imagePickerText}>
            {isUploading ? "업로드 중..." : "탭하여 이미지 변경"}
          </Text>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="음식점 이름"
        value={form.name}
        onChangeText={(v) => dispatch({ type: "SET", field: "name", value: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="설명"
        value={form.description}
        onChangeText={(v) => dispatch({ type: "SET", field: "description", value: v })}
        multiline
        numberOfLines={3}
      />
      <TextInput
        style={styles.input}
        placeholder="주소"
        value={form.address}
        onChangeText={(v) => dispatch({ type: "SET", field: "address", value: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="요리 종류"
        value={form.cuisineType}
        onChangeText={(v) => dispatch({ type: "SET", field: "cuisineType", value: v })}
      />

      <Text style={styles.sectionLabel}>위치 *</Text>
      <Text style={styles.sectionHint}>
        드라이버는 거리 기준으로 배정됩니다 — 정확하게 입력해 주세요.
      </Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => { void handleUseCurrentLocation(); }}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color="#0077CC" />
        ) : (
          <Text style={styles.secondaryButtonText}>📍 현재 위치 사용</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          if (!form.address) return Alert.alert("먼저 주소를 입력해 주세요");
          geocodeAddress();
        }}
        disabled={isGeocoding}
      >
        {isGeocoding ? (
          <ActivityIndicator color="#0077CC" />
        ) : (
          <Text style={styles.secondaryButtonText}>🔍 주소로 좌표 찾기</Text>
        )}
      </Pressable>

      {form.lat !== null && form.lng !== null ? (
        <Text style={styles.coordsText}>
          ✅ Location set: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.coordsTextMissing}>아직 위치가 설정되지 않았습니다</Text>
      )}

      <Pressable
        style={styles.button}
        onPress={handleSubmit}
        disabled={isPending || isUploading}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>변경 사항 저장</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  imagePicker: {
    height: 180, borderRadius: 12, borderWidth: 1, borderColor: "#ddd",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center",
    marginBottom: 16, overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imagePickerText: { color: "#999", fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    padding: 14, marginBottom: 16, fontSize: 16,
  },
  button: {
    backgroundColor: "#0077CC", borderRadius: 8,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  sectionHint: { fontSize: 12, color: "#999", marginBottom: 12 },
  secondaryButton: {
    borderWidth: 1, borderColor: "#0077CC", borderRadius: 8,
    padding: 14, alignItems: "center", marginBottom: 10,
  },
  secondaryButtonText: { color: "#0077CC", fontSize: 15, fontWeight: "600" },
  coordsText: { color: "#22C55E", fontSize: 13, fontWeight: "600", marginBottom: 16 },
  coordsTextMissing: { color: "#EF4444", fontSize: 13, marginBottom: 16 },
});

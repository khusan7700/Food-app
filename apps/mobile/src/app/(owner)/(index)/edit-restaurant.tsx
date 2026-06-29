import { useState } from "react";
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
import { Restaurant } from "@food-delivery/types";

export default function EditRestaurantScreen() {
  const queryClient = useQueryClient();

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["my-restaurant"],
    queryFn: () =>
      api.get<Restaurant | null>("/restaurants/mine").then((res) => res.data),
  });

  const [loadedId, setLoadedId] = useState<string | null>(null);
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

  if (restaurant && restaurant.id !== loadedId) {
    setLoadedId(restaurant.id);
    setName(restaurant.name);
    setDescription(restaurant.description ?? "");
    setAddress(restaurant.address);
    setCuisineType(restaurant.cuisineType);
    setImageUrl(restaurant.imageUrl);
    setLat(restaurant.lat);
    setLng(restaurant.lng);
  }

  const { mutate: updateRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/restaurants/${restaurant?.id}`, {
        name,
        description,
        address,
        cuisineType,
        imageUrl: imageUrl ?? undefined,
        lat,
        lng,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-restaurant"] });
      router.replace("/(owner)/(index)");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "Error",
        e.response?.data?.message ?? "Something went wrong",
      );
    },
  });

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Permission denied",
          "Location permission is required to set your restaurant's coordinates.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);
    } catch {
      Alert.alert("Error", "Could not get your current location.");
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
        "Error",
        e.response?.data?.message ?? "Could not find that address",
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
      Alert.alert("Upload failed", "Could not upload image. Please try again.");
    } finally {
      setImagePreview(null);
      setIsUploading(false);
    }
  }

  const displayedImage = imagePreview ?? imageUrl;

  function handleSubmit() {
    if (lat === null || lng === null) {
      return Alert.alert(
        "Location required",
        "Set your restaurant's location using your current location or by searching the address — drivers can't be matched without it.",
      );
    }
    updateRestaurant();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Restaurant</Text>

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
            {isUploading ? "Uploading..." : "Tap to change image"}
          </Text>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Restaurant name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Cuisine type"
        value={cuisineType}
        onChangeText={setCuisineType}
      />

      <Text style={styles.sectionLabel}>Location *</Text>
      <Text style={styles.sectionHint}>
        Drivers are matched by distance — this needs to be accurate.
      </Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          void handleUseCurrentLocation();
        }}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color="#FF6B35" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            📍 Use my current location
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          if (!address) {
            return Alert.alert("Enter an address first");
          }
          geocodeAddress();
        }}
        disabled={isGeocoding}
      >
        {isGeocoding ? (
          <ActivityIndicator color="#FF6B35" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            🔍 Find coordinates from address
          </Text>
        )}
      </Pressable>

      {lat !== null && lng !== null ? (
        <Text style={styles.coordsText}>
          ✅ Location set: {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.coordsTextMissing}>No location set yet</Text>
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
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
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
  image: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    color: "#999",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  sectionHint: { fontSize: 12, color: "#999", marginBottom: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: { color: "#FF6B35", fontSize: 15, fontWeight: "600" },
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

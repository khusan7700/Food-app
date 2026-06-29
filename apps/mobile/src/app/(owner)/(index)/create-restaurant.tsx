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
import { api } from "@/lib/axios";
import { pickAndUploadImage } from "@/lib/upload";

export default function CreateRestaurantScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { mutate: createRestaurant, isPending } = useMutation({
    mutationFn: () =>
      api.post("/restaurants", {
        name,
        description,
        address,
        cuisineType,
        imageUrl: imageUrl ?? undefined,
      }),
    onSuccess: (restaurant) => {
      void queryClient.setQueryData(["my-restaurant"], restaurant);
      router.replace("/(owner)/(index)");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "Error",
        e.response?.data?.message ?? "Something went wrong",
      );
    },
  });

  async function handlePickImage() {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage();
      if (url) setImageUrl(url);
    } catch {
      Alert.alert("Upload failed", "Could not upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit() {
    if (!name || !address || !cuisineType) {
      return Alert.alert("Please fill in all required fields");
    }
    createRestaurant();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your restaurant</Text>

      <Pressable
        style={styles.imagePicker}
        onPress={() => {
          void handlePickImage();
        }}
        disabled={isUploading}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <Text style={styles.imagePickerText}>
            {isUploading ? "Uploading..." : "Tap to upload restaurant image"}
          </Text>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Restaurant name *"
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
        placeholder="Address *"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Cuisine type * (e.g. Italian, Chinese)"
        value={cuisineType}
        onChangeText={setCuisineType}
      />

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
          <Text style={styles.buttonText}>Create Restaurant</Text>
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
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { pickAndUploadImage } from "@/lib/upload";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handlePickAvatar() {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage("user", (localUri) =>
        setAvatarPreview(localUri),
      );
      if (url) {
        updateUser({ avatarUrl: url });
      }
    } catch {
      Alert.alert("Upload failed", "Could not upload image. Please try again.");
    } finally {
      setAvatarPreview(null);
      setIsUploading(false);
    }
  }

  const displayedAvatar = avatarPreview ?? user?.avatarUrl;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.avatarPicker}
        onPress={() => {
          void handlePickAvatar();
        }}
        disabled={isUploading}
      >
        {displayedAvatar ? (
          <Image source={{ uri: displayedAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        {isUploading ? (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </Pressable>
      <Text style={styles.avatarHint}>Tap to change photo</Text>

      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          void logout();
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    marginBottom: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
  },
  name: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  email: { fontSize: 16, color: "#666", marginBottom: 4 },
  role: { fontSize: 14, color: "#999", marginBottom: 48 },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

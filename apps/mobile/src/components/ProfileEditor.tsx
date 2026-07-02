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
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { pickAndUploadImage } from "@/lib/upload";
import { api } from "@/lib/axios";

export function ProfileEditor() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: () =>
      api.patch<{ name: string; avatarUrl: string | null }>("/auth/me", { name }).then((r) => r.data),
    onSuccess: (updated) => {
      updateUser({ name: updated.name });
      setIsEditing(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert("오류", e.response?.data?.message ?? "변경 사항을 저장할 수 없습니다");
    },
  });

  async function handlePickAvatar() {
    setIsUploading(true);
    try {
      // POST /uploads/user already saves avatarUrl to the DB via uploads.service.ts
      // attach() — no separate PATCH /auth/me is needed.
      const url = await pickAndUploadImage("user", (localUri) =>
        setAvatarPreview(localUri),
      );
      if (url) updateUser({ avatarUrl: url });
    } catch {
      Alert.alert("업로드 실패", "이미지를 업로드할 수 없습니다.");
    } finally {
      setAvatarPreview(null);
      setIsUploading(false);
    }
  }

  function handleCancel() {
    setName(user?.name ?? "");
    setIsEditing(false);
  }

  const displayedAvatar = avatarPreview ?? user?.avatarUrl;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable
        style={styles.avatarPicker}
        onPress={() => { void handlePickAvatar(); }}
        disabled={isUploading}
      >
        {displayedAvatar ? (
          <Image source={{ uri: displayedAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(user?.name ?? "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        {isUploading && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </Pressable>
      <Text style={styles.avatarHint}>탭하여 사진 변경</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>이름</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Text style={styles.value}>{user?.name}</Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>이메일</Text>
          <Text style={[styles.value, styles.muted]}>{user?.email}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>역할</Text>
          <Text style={[styles.value, styles.muted]}>{user?.role}</Text>
        </View>
      </View>

      {isEditing ? (
        <View style={styles.editActions}>
          <Pressable style={styles.saveButton} onPress={() => saveProfile()} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>저장</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Text style={styles.editButtonText}>프로필 수정</Text>
        </Pressable>
      )}

      <Pressable style={styles.logoutButton} onPress={() => { void logout(); }}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 40,
  },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    marginBottom: 8,
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0077CC",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#fff" },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 12, color: "#999", marginBottom: 24 },
  card: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  label: { fontSize: 14, color: "#999", fontWeight: "500" },
  value: { fontSize: 15, fontWeight: "600", color: "#333" },
  muted: { color: "#aaa" },
  input: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0077CC",
    minWidth: 160,
    textAlign: "right",
    paddingVertical: 2,
  },
  editActions: {
    width: "100%",
    gap: 10,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#0077CC",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 15, color: "#666" },
  editButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#0077CC",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  editButtonText: { color: "#0077CC", fontSize: 15, fontWeight: "600" },
  logoutButton: {
    width: "100%",
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

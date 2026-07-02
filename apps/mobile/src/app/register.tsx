import { UserRole } from "@order-eats/types";
import { isAxiosError } from "axios";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { router } from "expo-router";

const ROLES = [
  { label: "고객", value: UserRole.CUSTOMER },
  { label: "음식점 사장님", value: UserRole.RESTAURANT_OWNER },
  { label: "드라이버", value: UserRole.DRIVER },
];

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      return Alert.alert("모든 필드를 입력해 주세요");
    }
    setIsLoading(true);
    try {
      await register({ name, email, password, role });
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? "문제가 발생했습니다"
        : "문제가 발생했습니다";
      Alert.alert("회원가입 실패", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이름"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Role selector */}
      <Text style={styles.label}>저는...</Text>
      <View style={styles.roleContainer}>
        {ROLES.map((r) => (
          <Pressable
            key={r.value}
            style={[
              styles.roleButton,
              role === r.value && styles.roleButtonActive,
            ]}
            onPress={() => setRole(r.value)}
          >
            <Text
              style={[
                styles.roleText,
                role === r.value && styles.roleTextActive,
              ]}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={() => {
          void handleRegister();
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>회원가입</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.replace("/login")}>
        <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  roleContainer: { flexDirection: "row", gap: 8, marginBottom: 24 },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  roleButtonActive: { backgroundColor: "#0077CC", borderColor: "#0077CC" },
  roleText: { fontSize: 13, color: "#666" },
  roleTextActive: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#0077CC",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#0077CC" },
});

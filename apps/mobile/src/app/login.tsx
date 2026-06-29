import { UserRole } from "@food-delivery/types";
import { login as kakaoLogin } from "@react-native-kakao/user";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { router } from "expo-router";

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loginWithKakao = useAuthStore((state) => state.loginWithKakao);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert("Please fill in all fields");
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace("/");
    } catch {
      Alert.alert("Login failed", "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleKakaoLogin() {
    setIsKakaoLoading(true);

    try {
      const { accessToken } = await kakaoLogin();
      await loginWithKakao(accessToken, UserRole.CUSTOMER);
      router.replace("/");
    } catch {
      Alert.alert("Kakao login failed", "Please try again");
    } finally {
      setIsKakaoLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={styles.button}
        onPress={() => {
          void handleLogin();
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      {Platform.OS !== "web" && (
        <Pressable
          style={[styles.button, styles.kakaoButton]}
          onPress={() => {
            void handleKakaoLogin();
          }}
          disabled={isKakaoLoading}
        >
          {isKakaoLoading ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <Text style={styles.kakaoButtonText}>Continue with Kakao</Text>
          )}
        </Pressable>
      )}

      <Pressable onPress={() => router.push("/register")}>
        <Text style={styles.link}>Don&apos;t have an account? Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  button: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  kakaoButton: { backgroundColor: "#FEE500" },
  kakaoButtonText: { color: "#3C1E1E", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#FF6B35" },
});

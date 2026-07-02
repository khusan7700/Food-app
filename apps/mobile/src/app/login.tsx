import { UserRole } from "@order-eats/types";
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
    if (!email || !password) return Alert.alert("모든 필드를 입력해 주세요");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch {
      Alert.alert("로그인 실패", "이메일 또는 비밀번호가 올바르지 않습니다");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleKakaoLogin() {
    setIsKakaoLoading(true);

    try {
      const { accessToken } = await kakaoLogin();
      await loginWithKakao(accessToken, UserRole.CUSTOMER);
    } catch {
      Alert.alert("카카오 로그인 실패", "다시 시도해 주세요");
    } finally {
      setIsKakaoLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>다시 오셨군요</Text>

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
          <Text style={styles.buttonText}>로그인</Text>
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
            <Text style={styles.kakaoButtonText}>카카오로 계속하기</Text>
          )}
        </Pressable>
      )}

      <Pressable onPress={() => router.push("/register")}>
        <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
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
    backgroundColor: "#0077CC",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  kakaoButton: { backgroundColor: "#FEE500" },
  kakaoButtonText: { color: "#3C1E1E", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#0077CC" },
});

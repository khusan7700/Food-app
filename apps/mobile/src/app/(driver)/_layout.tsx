import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

export default function DriverLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "house.fill", android: "home", web: "home" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: "배달중",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "car.fill", android: "local_shipping", web: "local_shipping" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="waiting"
        options={{
          title: "대기",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "tray.full.fill", android: "inbox", web: "inbox" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "내역",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "clock.fill", android: "history", web: "history" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}

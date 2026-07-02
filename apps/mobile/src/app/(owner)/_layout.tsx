import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

export default function OwnerLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="(index)"
        options={{
          title: "주문",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "shippingbox.fill", android: "local_shipping", web: "inventory" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "메뉴",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "menucard.fill", android: "restaurant_menu", web: "restaurant_menu" }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "분석",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "chart.bar.xaxis", android: "bar_chart", web: "bar_chart" }}
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

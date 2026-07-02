import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { useCartStore } from "@/stores/cart.store";
import { MenuCategory, MenuItem, Restaurant } from "@order-eats/types";

function formatPrice(won: number) {
  return Math.round(won).toLocaleString("ko-KR");
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, restaurantId, clearCart, items } = useCartStore();

  const { data: restaurant, isLoading: loadingRestaurant } =
    useQuery<Restaurant>({
      queryKey: ["restaurant", id],
      queryFn: () =>
        api.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data),
      enabled: !!id,
    });

  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["categories", id],
    queryFn: () =>
      api.get<MenuCategory[]>(`/menu/categories/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu-items", id],
    queryFn: () => api.get<MenuItem[]>(`/menu/items/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  function handleAddItem(item: MenuItem) {
    if (!restaurant) return;

    // different restaurant in cart — confirm before clearing
    if (restaurantId && restaurantId !== item.restaurantId) {
      Alert.alert(
        "새 장바구니를 시작할까요?",
        `장바구니에 ${useCartStore.getState().restaurantName}의 메뉴가 있습니다. 비우고 ${restaurant.name}에서 담을까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "비우고 담기",
            style: "destructive",
            onPress: () => {
              clearCart();
              addItem({
                id: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.imageUrl,
                restaurantId: item.restaurantId,
                restaurantName: restaurant.name,
              });
            },
          },
        ],
      );
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      restaurantId: item.restaurantId,
      restaurantName: restaurant.name,
    });
  }

  function getItemQuantity(itemId: string) {
    return items.find((i) => i.id === itemId)?.quantity ?? 0;
  }

  if (loadingRestaurant) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0077CC" />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView>
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.heroImage}
          />
        ) : (
          <View style={styles.heroPlaceholder} />
        )}

        {!restaurant.isOpen && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>
              🔴 현재 영업 중이 아닙니다
            </Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <View
              style={[
                styles.openBadge,
                !restaurant.isOpen && styles.openBadgeClosed,
              ]}
            >
              <Text
                style={[
                  styles.openBadgeText,
                  !restaurant.isOpen && styles.openBadgeTextClosed,
                ]}
              >
                {restaurant.isOpen ? "영업중" : "영업종료"}
              </Text>
            </View>
          </View>
          <Text style={styles.cuisine}>{restaurant.cuisineType}</Text>
          {restaurant.description ? (
            <Text style={styles.description}>{restaurant.description}</Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
            <Text style={styles.address}>{restaurant.address}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuHeading}>메뉴</Text>

          {categories.map((category) => {
            const categoryItems = menuItems.filter(
              (i) => i.categoryId === category.id && i.isAvailable,
            );

            if (categoryItems.length === 0) return null;

            return (
              <View key={category.id} style={styles.categoryBlock}>
                <Text style={styles.categoryName}>{category.name}</Text>

                {categoryItems.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.description ? (
                          <Text
                            style={styles.itemDescription}
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        ) : null}
                        <Text style={styles.itemPrice}>
                          ₩{formatPrice(item.price)}
                        </Text>
                      </View>

                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.itemImage}
                        />
                      ) : null}

                      {qty > 0 ? (
                        <View style={styles.qtyControls}>
                          <Pressable
                            style={styles.qtyButton}
                            onPress={() =>
                              useCartStore.getState().decrementItem(item.id)
                            }
                            disabled={!restaurant.isOpen}
                          >
                            <Text style={styles.qtyButtonText}>−</Text>
                          </Pressable>
                          <Text style={styles.qtyCount}>{qty}</Text>
                          <Pressable
                            style={styles.qtyButton}
                            onPress={() => handleAddItem(item)}
                            disabled={!restaurant.isOpen}
                          >
                            <Text style={styles.qtyButtonText}>+</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={[
                            styles.addButton,
                            !restaurant.isOpen && styles.addButtonDisabled,
                          ]}
                          onPress={() => handleAddItem(item)}
                          disabled={!restaurant.isOpen}
                        >
                          <Text style={styles.addButtonText}>담기</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closedBanner: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  closedBannerText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  openBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  openBadgeClosed: {
    backgroundColor: "#FEE2E2",
  },
  openBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  openBadgeTextClosed: {
    color: "#DC2626",
  },
  addButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#f0f0f0",
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  cuisine: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rating: {
    fontSize: 14,
    color: "#333",
  },
  address: {
    fontSize: 13,
    color: "#888",
    flex: 1,
  },
  menuSection: {
    padding: 16,
  },
  menuHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  categoryBlock: {
    marginBottom: 24,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10,
    color: "#0077CC",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0077CC",
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#0077CC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0077CC",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  qtyCount: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
});

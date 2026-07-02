import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/axios";
import { PaginatedResult, Restaurant } from "@order-eats/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useRestaurantStatusSocket } from "@/hooks/use-order-socket";

export default function CustomerHomeScreen() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["restaurants", debouncedSearch],
    queryFn: () =>
      api
        .get<PaginatedResult<Restaurant>>("/restaurants", {
          params: debouncedSearch ? { search: debouncedSearch } : undefined,
        })
        .then((r) => r.data.data),
  });

  // Real-time open/closed update: invalidate list + detail cache immediately.
  useRestaurantStatusSocket(
    useCallback(
      (restaurantId: string) => {
        void queryClient.invalidateQueries({ queryKey: ["restaurants"] });
        void queryClient.invalidateQueries({
          queryKey: ["restaurant", restaurantId],
        });
      },
      [queryClient],
    ),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.heading}>오늘 뭐 드실래요?</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="음식점 또는 요리 검색..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0077CC" />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>음식점을 찾을 수 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.isOpen && styles.cardClosed]}
              onPress={() =>
                router.push(`/(customer)/(tabs)/(home)/restaurant/${item.id}`)
              }
              disabled={!item.isOpen}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={[styles.cardImage, !item.isOpen && styles.cardImageClosed]}
                />
              ) : (
                <View style={styles.cardImagePlaceholder} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCuisine}>{item.cuisineType}</Text>
                <View style={styles.cardMeta}>
                  {Number(item.rating) > 0 ? (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingValue}>
                        {Number(item.rating).toFixed(1)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noRating}>신규</Text>
                  )}
                  <View
                    style={[styles.openBadge, !item.isOpen && styles.closedBadge]}
                  >
                    <Text
                      style={[
                        styles.openBadgeText,
                        !item.isOpen && styles.closedBadgeText,
                      ]}
                    >
                      {item.isOpen ? "영업중" : "영업종료"}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 12,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#f0f0f0",
  },
  cardBody: {
    padding: 12,
  },
  cardName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardCuisine: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRating: {
    fontSize: 13,
    color: "#333",
  },
  cardClosed: {
    opacity: 0.6,
  },
  cardImageClosed: {
    opacity: 0.5,
  },
  openBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  openBadgeText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  closedBadge: {
    backgroundColor: "#FEE2E2",
  },
  closedBadgeText: {
    color: "#DC2626",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingStar: {
    fontSize: 13,
    color: "#0077CC",
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  noRating: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
});

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { pickAndUploadImage } from "@/lib/upload";
import { MenuCategory, MenuItem, Restaurant } from "@order-eats/types";

function formatPrice(won: number) {
  return Math.round(won).toLocaleString("ko-KR");
}

export default function OwnerMenuScreen() {
  const queryClient = useQueryClient();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(
    null,
  );
  const [isUploadingItemImage, setIsUploadingItemImage] = useState(false);

  const {
    data: restaurant,
    isPending: restaurantPending,
    isFetching: restaurantFetching,
  } = useQuery<Restaurant | null>({
    queryKey: ["my-restaurant"],
    queryFn: () =>
      api.get<Restaurant | null>("/restaurants/mine").then((r) => r.data),
  });

  const {
    data: categories = [],
    isPending: categoriesPending,
    isFetching: categoriesFetching,
  } = useQuery<MenuCategory[]>({
    queryKey: ["categories", restaurant?.id],
    queryFn: () =>
      api
        .get<MenuCategory[]>(`/menu/categories/${restaurant?.id}`)
        .then((r) => r.data),
    enabled: !!restaurant?.id,
  });

  const restaurantLoading = restaurantPending || restaurantFetching;
  const categoriesLoading =
    !!restaurant?.id && (categoriesPending || categoriesFetching);

  const { data: items = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu-items", restaurant?.id],
    queryFn: () =>
      api.get<MenuItem[]>(`/menu/items/${restaurant?.id}`).then((r) => r.data),
    enabled: !!restaurant?.id,
  });

  function closeCategoryModal() {
    setShowCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryName("");
  }

  function openCreateCategoryModal() {
    setEditingCategoryId(null);
    setCategoryName("");
    setShowCategoryModal(true);
  }

  function openEditCategoryModal(category: MenuCategory) {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setShowCategoryModal(true);
  }

  const { mutate: createCategory, isPending: creatingCategory } = useMutation({
    mutationFn: (name: string) => api.post("/menu/categories", { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["categories", restaurant?.id],
      });
      closeCategoryModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "카테고리를 만들 수 없습니다",
      );
    },
  });

  const { mutate: updateCategory, isPending: updatingCategory } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/menu/categories/${id}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["categories", restaurant?.id],
      });
      closeCategoryModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "카테고리를 수정할 수 없습니다",
      );
    },
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["categories", restaurant?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["menu-items", restaurant?.id],
      });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "카테고리를 삭제할 수 없습니다",
      );
    },
  });

  function handleSaveCategory() {
    const name = categoryName.trim();
    if (!name) {
      Alert.alert("이름 필요", "카테고리 이름을 입력해 주세요.");
      return;
    }
    if (editingCategoryId) {
      updateCategory({ id: editingCategoryId, name });
    } else {
      createCategory(name);
    }
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditingItemId(null);
    setSelectedCategoryId(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemImageUrl(null);
  }

  function openCreateItemModal(categoryId: string) {
    setEditingItemId(null);
    setSelectedCategoryId(categoryId);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemImageUrl(null);
    setShowItemModal(true);
  }

  function openEditItemModal(item: MenuItem) {
    setEditingItemId(item.id);
    setSelectedCategoryId(item.categoryId);
    setItemName(item.name);
    setItemDescription(item.description ?? "");
    setItemPrice(String(Math.round(item.price)));
    setItemImageUrl(item.imageUrl);
    setShowItemModal(true);
  }

  const { mutate: createItem, isPending: creatingItem } = useMutation({
    mutationFn: () =>
      api.post("/menu/items", {
        categoryId: selectedCategoryId,
        name: itemName,
        description: itemDescription.trim() || undefined,
        price: Math.round(parseFloat(itemPrice)),
        imageUrl: itemImageUrl ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["menu-items", restaurant?.id],
      });
      closeItemModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "메뉴를 만들 수 없습니다",
      );
    },
  });

  const { mutate: updateItem, isPending: updatingItem } = useMutation({
    mutationFn: () =>
      api.patch(`/menu/items/${editingItemId}`, {
        name: itemName,
        description: itemDescription.trim() || undefined,
        price: Math.round(parseFloat(itemPrice)),
        imageUrl: itemImageUrl ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["menu-items", restaurant?.id],
      });
      closeItemModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "메뉴를 수정할 수 없습니다",
      );
    },
  });

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/menu/items/${id}`, { isAvailable }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["menu-items", restaurant?.id],
      }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "가용 여부를 변경할 수 없습니다",
      );
    },
  });

  function handleSaveItem() {
    const name = itemName.trim();
    const price = itemPrice.trim();
    if (!name || !price || Number.isNaN(parseFloat(price))) {
      Alert.alert(
        "필수 항목",
        "메뉴 이름과 유효한 가격을 입력해 주세요.",
      );
      return;
    }
    if (editingItemId) {
      updateItem();
    } else {
      if (!selectedCategoryId) {
        Alert.alert("오류", "카테고리가 선택되지 않았습니다.");
        return;
      }
      createItem();
    }
  }

  async function handlePickItemImage() {
    setIsUploadingItemImage(true);
    try {
      const url = await pickAndUploadImage("menu-item", (localUri) =>
        setItemImagePreview(localUri),
      );
      if (url) setItemImageUrl(url);
    } catch {
      Alert.alert("업로드 실패", "이미지를 업로드할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setItemImagePreview(null);
      setIsUploadingItemImage(false);
    }
  }

  const displayedItemImage = itemImagePreview ?? itemImageUrl;

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["menu-items", restaurant?.id],
      }),
  });

  if (restaurantLoading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0077CC" />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            먼저 주문 탭에서 음식점을 등록하세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSavingCategory = creatingCategory || updatingCategory;
  const isSavingItem = creatingItem || updatingItem;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Pressable style={styles.addButton} onPress={openCreateCategoryModal}>
        <Text style={styles.addButtonText}>+ 카테고리 추가</Text>
      </Pressable>

      <FlatList
        style={styles.list}
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item: category }) => {
          const categoryItems = items.filter(
            (i) => i.categoryId === category.id,
          );
          return (
            <View style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.categoryActions}>
                  <Pressable onPress={() => openEditCategoryModal(category)}>
                    <Text style={styles.editText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "카테고리 삭제?",
                        "이 카테고리의 모든 메뉴도 함께 삭제됩니다.",
                        [
                          { text: "취소", style: "cancel" },
                          {
                            text: "삭제",
                            style: "destructive",
                            onPress: () => {
                              deleteCategory(category.id);
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>

              {categoryItems.map((item) => {
                const isAvailable = item.isAvailable !== false;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => openEditItemModal(item)}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.itemThumb}
                      />
                    ) : null}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        ₩{formatPrice(item.price)}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <View style={styles.availabilityRow}>
                        <Text style={styles.availabilityLabel}>
                          {isAvailable ? "판매중" : "품절"}
                        </Text>
                        <Switch
                          value={isAvailable}
                          onValueChange={(value) =>
                            toggleAvailability({
                              id: item.id,
                              isAvailable: value,
                            })
                          }
                          trackColor={{ false: "#FECACA", true: "#86EFAC" }}
                          thumbColor={isAvailable ? "#22C55E" : "#EF4444"}
                        />
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert("메뉴 삭제?", item.name, [
                            { text: "취소", style: "cancel" },
                            {
                              text: "삭제",
                              style: "destructive",
                              onPress: () => deleteItem(item.id),
                            },
                          ]);
                        }}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}

              <Pressable
                style={styles.addItemButton}
                onPress={() => openCreateItemModal(category.id)}
              >
                <Text style={styles.addItemText}>+ 메뉴 추가</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingCategoryId ? "카테고리 수정" : "새 카테고리"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="카테고리 이름"
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <Pressable
              style={styles.button}
              onPress={handleSaveCategory}
              disabled={isSavingCategory || !categoryName.trim()}
            >
              {isSavingCategory ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {editingCategoryId ? "저장" : "추가"}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={closeCategoryModal}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingItemId ? "메뉴 수정" : "새 메뉴"}
            </Text>

            <Pressable
              style={styles.imagePicker}
              onPress={() => {
                void handlePickItemImage();
              }}
              disabled={isUploadingItemImage}
            >
              {displayedItemImage ? (
                <Image
                  source={{ uri: displayedItemImage }}
                  style={styles.itemImage}
                />
              ) : (
                <Text style={styles.imagePickerText}>
                  {isUploadingItemImage ? "업로드 중..." : "탭하여 메뉴 이미지 추가"}
                </Text>
              )}
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="메뉴 이름"
              value={itemName}
              onChangeText={setItemName}
            />
            <TextInput
              style={styles.input}
              placeholder="설명"
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
              numberOfLines={2}
            />
            <TextInput
              style={styles.input}
              placeholder="가격 예: 8000"
              value={itemPrice}
              onChangeText={setItemPrice}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={styles.button}
              onPress={handleSaveItem}
              disabled={
                isSavingItem ||
                isUploadingItemImage ||
                !itemName.trim() ||
                !itemPrice.trim()
              }
            >
              {isSavingItem ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {editingItemId ? "저장" : "추가"}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={closeItemModal}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#0077CC",
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  categoryBlock: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryActions: {
    flexDirection: "row",
    gap: 16,
  },
  editText: {
    color: "#3B82F6",
    fontSize: 14,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    gap: 10,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemActions: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  availabilityLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    width: 72,
    textAlign: "right",
  },
  addItemButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0077CC",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addItemText: {
    color: "#0077CC",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0077CC",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelText: {
    textAlign: "center",
    color: "#666",
    fontSize: 15,
  },
  imagePicker: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    color: "#999",
    fontSize: 13,
  },
});

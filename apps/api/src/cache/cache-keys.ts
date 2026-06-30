export const CacheKeys = {
  RESTAURANTS_ALL: 'restaurants:all',
  RESTAURANT_BY_ID: (id: string) => `restaurants:${id}`,
  MENU_CATEGORIES: (restaurantId: string) => `menu:categories:${restaurantId}`,
  MENU_ITEMS: (restaurantId: string) => `menu:items:${restaurantId}`,
} as const;

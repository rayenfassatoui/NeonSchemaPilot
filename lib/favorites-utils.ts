/**
 * Favorites Utilities
 * Functions for managing favorites and bookmarks
 */

import type { Favorite, FavoriteType, FavoriteStatistics } from "@/types/favorites";

/**
 * Sort favorites by different criteria
 */
export function sortFavorites(
  favorites: Favorite[],
  sortBy: "name" | "date" | "type" | "access"
): Favorite[] {
  const sorted = [...favorites];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "date":
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "type":
      return sorted.sort((a, b) => a.type.localeCompare(b.type));
    case "access":
      return sorted.sort((a, b) => b.accessCount - a.accessCount);
    default:
      return sorted;
  }
}

/**
 * Filter favorites by type
 */
export function filterFavoritesByType(
  favorites: Favorite[],
  types: FavoriteType[]
): Favorite[] {
  if (types.length === 0) return favorites;
  return favorites.filter((fav) => types.includes(fav.type));
}

/**
 * Search favorites by name, description, or tags
 */
export function searchFavorites(favorites: Favorite[], query: string): Favorite[] {
  const lowerQuery = query.toLowerCase();
  return favorites.filter(
    (fav) =>
      fav.name.toLowerCase().includes(lowerQuery) ||
      fav.description?.toLowerCase().includes(lowerQuery) ||
      fav.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Calculate favorites statistics
 */
export function calculateFavoriteStatistics(favorites: Favorite[]): FavoriteStatistics {
  const byType: Record<FavoriteType, number> = {
    table: 0,
    query: 0,
    view: 0,
    chart: 0,
    schedule: 0,
  };

  favorites.forEach((fav) => {
    byType[fav.type] = (byType[fav.type] || 0) + 1;
  });

  const mostAccessed = [...favorites]
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 5);

  const recentlyAdded = [...favorites]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentlyAccessed = [...favorites]
    .filter((fav) => fav.lastAccessedAt)
    .sort((a, b) => 
      new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime()
    )
    .slice(0, 5);

  return {
    totalFavorites: favorites.length,
    byType,
    mostAccessed,
    recentlyAdded,
    recentlyAccessed,
  };
}

/**
 * Group favorites by type
 */
export function groupFavoritesByType(favorites: Favorite[]): Record<FavoriteType, Favorite[]> {
  const grouped: Record<FavoriteType, Favorite[]> = {
    table: [],
    query: [],
    view: [],
    chart: [],
    schedule: [],
  };

  favorites.forEach((fav) => {
    grouped[fav.type].push(fav);
  });

  return grouped;
}

/**
 * Get favorite icon based on type
 */
export function getFavoriteIcon(type: FavoriteType): string {
  const icons: Record<FavoriteType, string> = {
    table: "Table",
    query: "Code",
    view: "Eye",
    chart: "BarChart",
    schedule: "Clock",
  };
  return icons[type] || "Star";
}

/**
 * Get favorite color based on type
 */
export function getFavoriteColor(type: FavoriteType): string {
  const colors: Record<FavoriteType, string> = {
    table: "text-blue-500",
    query: "text-purple-500",
    view: "text-green-500",
    chart: "text-orange-500",
    schedule: "text-pink-500",
  };
  return colors[type] || "text-gray-500";
}

/**
 * Format last accessed time
 */
export function formatLastAccessed(date: string): string {
  const now = new Date();
  const accessed = new Date(date);
  const diffMs = now.getTime() - accessed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return accessed.toLocaleDateString();
}

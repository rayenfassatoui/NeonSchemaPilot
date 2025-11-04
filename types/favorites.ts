/**
 * Favorites and Bookmarks Types
 */

export type FavoriteType = "table" | "query" | "view" | "chart" | "schedule";

export interface Favorite {
  id: string;
  name: string;
  description?: string;
  type: FavoriteType;
  resourceId: string; // ID of the table, query, etc.
  resourceData?: any; // Additional data about the resource
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  favorites: string[]; // Array of favorite IDs
}

export interface FavoriteStatistics {
  totalFavorites: number;
  byType: Record<FavoriteType, number>;
  mostAccessed: Favorite[];
  recentlyAdded: Favorite[];
  recentlyAccessed: Favorite[];
}

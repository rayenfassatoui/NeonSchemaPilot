"use client";

/**
 * Favorites Manager Component
 * Interface for managing favorites and bookmarks
 */

import { useState, useEffect } from "react";
import { Star, Trash2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Favorite, FavoriteType } from "@/types/favorites";
import { searchFavorites, sortFavorites, getFavoriteColor } from "@/lib/favorites-utils";

interface FavoritesManagerProps {
  connectionString?: string;
}

export function FavoritesManager({ connectionString }: FavoritesManagerProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FavoriteType | "all">("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Failed to load favorites");

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error("Error loading favorites:", err);
    }
  };

  const deleteFavorite = async (id: string) => {
    if (!confirm("Remove this favorite?")) return;

    try {
      const response = await fetch(`/api/favorites?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete favorite");

      setFavorites(favorites.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Error deleting favorite:", err);
    }
  };

  const filteredFavorites = sortFavorites(
    searchQuery
      ? searchFavorites(favorites, searchQuery)
      : selectedType === "all"
      ? favorites
      : favorites.filter((f) => f.type === selectedType),
    "access"
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search favorites..."
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {(["all", "table", "query", "view", "chart", "schedule"] as const).map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-6">
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No favorites yet</p>
            <p className="text-sm">Star items to access them quickly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFavorites.map((favorite) => (
              <div
                key={favorite.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Star className={`h-5 w-5 ${getFavoriteColor(favorite.type)} fill-current`} />
                  <div>
                    <p className="font-medium">{favorite.name}</p>
                    {favorite.description && (
                      <p className="text-sm text-muted-foreground">{favorite.description}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{favorite.type}</Badge>
                      <Badge variant="secondary">{favorite.accessCount} uses</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteFavorite(favorite.id)}
                  title="Remove favorite"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

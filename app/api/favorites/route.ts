/**
 * Favorites API Route
 * Manages favorites and bookmarks
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Favorite, FavoriteFolder } from "@/types/favorites";

const FAVORITES_FILE = path.join(process.cwd(), "data", "favorites.json");
const FOLDERS_FILE = path.join(process.cwd(), "data", "favorite-folders.json");

// Ensure data files exist
async function ensureDataFiles() {
  const dataDir = path.join(process.cwd(), "data");
  
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  
  try {
    await fs.access(FAVORITES_FILE);
  } catch {
    await fs.writeFile(FAVORITES_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(FOLDERS_FILE);
  } catch {
    await fs.writeFile(FOLDERS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * GET - Retrieve favorites or folders
 */
export async function GET(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "favorites" or "folders"
    const id = searchParams.get("id");
    
    if (type === "folders") {
      const content = await fs.readFile(FOLDERS_FILE, "utf-8");
      const folders: FavoriteFolder[] = JSON.parse(content);
      
      if (id) {
        const folder = folders.find((f) => f.id === id);
        if (!folder) {
          return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }
        return NextResponse.json({ folder });
      }
      
      return NextResponse.json({ folders });
    }
    
    // Default: return favorites
    const content = await fs.readFile(FAVORITES_FILE, "utf-8");
    const favorites: Favorite[] = JSON.parse(content);
    
    if (id) {
      const favorite = favorites.find((f) => f.id === id);
      if (!favorite) {
        return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
      }
      return NextResponse.json({ favorite });
    }
    
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Error retrieving favorites:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve favorites" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new favorite or folder
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const { type, data } = body;
    
    if (type === "folder") {
      const folder: FavoriteFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favorites: [],
      };
      
      const content = await fs.readFile(FOLDERS_FILE, "utf-8");
      const folders: FavoriteFolder[] = JSON.parse(content);
      folders.push(folder);
      
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2));
      return NextResponse.json({ success: true, folder });
    }
    
    // Create favorite
    const favorite: Favorite = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      type: data.type,
      resourceId: data.resourceId,
      resourceData: data.resourceData,
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      accessCount: 0,
    };
    
    const content = await fs.readFile(FAVORITES_FILE, "utf-8");
    const favorites: Favorite[] = JSON.parse(content);
    favorites.push(favorite);
    
    await fs.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error("Error creating favorite:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create favorite" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a favorite or folder
 */
export async function PUT(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const body = await req.json();
    const { type, id, updates, action } = body;
    
    if (type === "folder") {
      const content = await fs.readFile(FOLDERS_FILE, "utf-8");
      const folders: FavoriteFolder[] = JSON.parse(content);
      
      const folderIndex = folders.findIndex((f) => f.id === id);
      if (folderIndex === -1) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      
      Object.assign(folders[folderIndex], updates, {
        updatedAt: new Date().toISOString(),
      });
      
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2));
      return NextResponse.json({ success: true, folder: folders[folderIndex] });
    }
    
    // Update favorite
    const content = await fs.readFile(FAVORITES_FILE, "utf-8");
    const favorites: Favorite[] = JSON.parse(content);
    
    const favoriteIndex = favorites.findIndex((f) => f.id === id);
    if (favoriteIndex === -1) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }
    
    if (action === "access") {
      // Increment access count and update last accessed time
      favorites[favoriteIndex].accessCount += 1;
      favorites[favoriteIndex].lastAccessedAt = new Date().toISOString();
    } else {
      // Regular update
      Object.assign(favorites[favoriteIndex], updates, {
        updatedAt: new Date().toISOString(),
      });
    }
    
    await fs.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
    return NextResponse.json({ success: true, favorite: favorites[favoriteIndex] });
  } catch (error) {
    console.error("Error updating favorite:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update favorite" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a favorite or folder
 */
export async function DELETE(req: NextRequest) {
  try {
    await ensureDataFiles();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    if (type === "folder") {
      const content = await fs.readFile(FOLDERS_FILE, "utf-8");
      let folders: FavoriteFolder[] = JSON.parse(content);
      
      const initialLength = folders.length;
      folders = folders.filter((f) => f.id !== id);
      
      if (folders.length === initialLength) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2));
      return NextResponse.json({ success: true, message: "Folder deleted" });
    }
    
    // Delete favorite
    const content = await fs.readFile(FAVORITES_FILE, "utf-8");
    let favorites: Favorite[] = JSON.parse(content);
    
    const initialLength = favorites.length;
    favorites = favorites.filter((f) => f.id !== id);
    
    if (favorites.length === initialLength) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }
    
    await fs.writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
    return NextResponse.json({ success: true, message: "Favorite deleted" });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete favorite" },
      { status: 500 }
    );
  }
}

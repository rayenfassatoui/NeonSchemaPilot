import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { QueryHistoryEntry, QueryHistoryFilter, QueryHistoryStats } from "@/types/query-history";

const QUERY_HISTORY_FILE = "data/query-history.json";

export class QueryHistoryManager {
  private history: QueryHistoryEntry[] = [];
  private loaded = false;

  async load() {
    try {
      const raw = await readFile(QUERY_HISTORY_FILE, "utf8");
      this.history = JSON.parse(raw) as QueryHistoryEntry[];
      this.loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.history = [];
        this.loaded = true;
        await this.save();
      } else {
        throw error;
      }
    }
  }

  async save() {
    await mkdir(dirname(QUERY_HISTORY_FILE), { recursive: true });
    await writeFile(QUERY_HISTORY_FILE, JSON.stringify(this.history, null, 2), "utf8");
  }

  async addEntry(entry: Omit<QueryHistoryEntry, "id" | "executedAt">) {
    if (!this.loaded) await this.load();

    const newEntry: QueryHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      executedAt: new Date().toISOString(),
    };

    this.history.unshift(newEntry); // Add to beginning
    
    // Keep only last 500 entries
    if (this.history.length > 500) {
      this.history = this.history.slice(0, 500);
    }

    await this.save();
    return newEntry;
  }

  async getAll(filter?: QueryHistoryFilter): Promise<QueryHistoryEntry[]> {
    if (!this.loaded) await this.load();

    let filtered = [...this.history];

    if (filter?.operationType) {
      filtered = filtered.filter(entry => entry.operationType === filter.operationType);
    }

    if (filter?.status) {
      filtered = filtered.filter(entry => entry.status === filter.status);
    }

    if (filter?.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.query.toLowerCase().includes(term) ||
        entry.tables?.some(table => table.toLowerCase().includes(term))
      );
    }

    if (filter?.startDate) {
      filtered = filtered.filter(entry => entry.executedAt >= filter.startDate!);
    }

    if (filter?.endDate) {
      filtered = filtered.filter(entry => entry.executedAt <= filter.endDate!);
    }

    return filtered;
  }

  async getStats(): Promise<QueryHistoryStats> {
    if (!this.loaded) await this.load();

    const totalQueries = this.history.length;
    const successfulQueries = this.history.filter(e => e.status === "success").length;
    const failedQueries = this.history.filter(e => e.status === "error").length;

    const executionTimes = this.history
      .filter(e => e.executionTimeMs !== undefined)
      .map(e => e.executionTimeMs!);
    
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    const queryTypeDistribution = this.history.reduce((acc, entry) => {
      acc[entry.operationType] = (acc[entry.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      avgExecutionTime,
      queryTypeDistribution,
    };
  }

  async clear() {
    if (!this.loaded) await this.load();
    this.history = [];
    await this.save();
  }

  async deleteEntry(id: string) {
    if (!this.loaded) await this.load();
    this.history = this.history.filter(entry => entry.id !== id);
    await this.save();
  }
}

// Singleton instance
let instance: QueryHistoryManager | null = null;

export function getQueryHistoryManager(): QueryHistoryManager {
  if (!instance) {
    instance = new QueryHistoryManager();
  }
  return instance;
}

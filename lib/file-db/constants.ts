import type { Privilege } from "@/types/file-db";

export const DEFAULT_DB_VERSION = 1;

export const ALLOWED_PRIVILEGES: Privilege[] = [
  "select",
  "insert",
  "update",
  "delete",
  "alter",
  "drop",
  "manage_permissions",
];

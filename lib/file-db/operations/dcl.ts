import { randomUUID } from "node:crypto";

import type { DclGrantOperation, DclRevokeOperation, OperationExecution } from "@/types/ai";

import { ensurePrivileges, nowIso } from "../helpers";
import type { OperationContext } from "./types";

export function executeGrant(
  operation: DclGrantOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable, ensureRole } = context;
  const table = requireTable(operation.table);
  const privileges = ensurePrivileges(operation.privileges);
  const role = ensureRole(operation.role, operation.description);

  table.permissions[role.name] = {
    role: role.name,
    privileges,
    grantedAt: nowIso(),
  };

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DCL",
    status: "success",
    detail: `Granted ${privileges.join(", ")} on "${operation.table}" to role "${role.name}".`,
  };
}

export function executeRevoke(
  operation: DclRevokeOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);
  const privileges = ensurePrivileges(operation.privileges);
  const entry = table.permissions[operation.role];

  if (!entry) {
    throw new Error(`Role "${operation.role}" has no permissions on table "${operation.table}".`);
  }

  entry.privileges = entry.privileges.filter((privilege) => !privileges.includes(privilege));
  if (!entry.privileges.length) {
    delete table.permissions[operation.role];
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DCL",
    status: "success",
    detail: `Revoked ${privileges.join(", ")} on "${operation.table}" from role "${operation.role}".`,
  };
}

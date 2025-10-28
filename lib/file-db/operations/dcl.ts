import { randomUUID } from "node:crypto";

import type { DclGrantOperation, DclRevokeOperation, OperationExecution } from "@/types/ai";

import { ensurePrivileges, nowIso } from "../helpers";
import type { OperationContext } from "./types";

export async function executeGrant(
  operation: DclGrantOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, ensureRole, replicator, state } = context;
  const table = requireTable(operation.table);
  const privileges = ensurePrivileges(operation.privileges);
  const description = operation.description ?? state.roles[operation.role]?.description;

  if (replicator) {
    await replicator.grant(table, operation.role, privileges, description);
  }

  const role = ensureRole(operation.role, description);
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

export async function executeRevoke(
  operation: DclRevokeOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);
  const privileges = ensurePrivileges(operation.privileges);
  const entry = table.permissions[operation.role];

  if (!entry) {
    throw new Error(`Role "${operation.role}" has no permissions on table "${operation.table}".`);
  }

  if (replicator) {
    await replicator.revoke(table, operation.role, privileges);
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

import { testOwner } from "./collections"

// Row fixtures for folder unit tests running against the in-memory
// database: folders themselves plus filable files and automations.
// Collection rows come from ./collections.

export function folderDoc(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org",
    name: "Projects",
    visibility: { mode: "organization" },
    createdBy: testOwner,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

export function fileDoc(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org",
    visibility: { mode: "organization" },
    ownerId: testOwner,
    storageId: "storage:1",
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

export function automationDoc(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org",
    name: "Digest",
    instructions: "Send the digest.",
    visibility: { mode: "organization" },
    principal: { kind: "organization" },
    type: "cron",
    access: { integrations: [], web: false },
    trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: 1 },
    status: "active",
    createdBy: testOwner,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

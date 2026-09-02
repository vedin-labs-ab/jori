import { type WithoutSystemFields } from "convex/server"
import { testOwner } from "./collections"

// Row fixtures for folder unit tests running against the in-memory
// database: folders themselves plus filable files and jobs.
// Collection rows come from ./collections. Overrides refine any field of
// the row, so a field the schema has retired fails typecheck instead of
// passing silently.

// dataModel only ships types, so it is referenced through import types: a
// value-position import statement would survive transpilation and fail to
// resolve at test runtime.
type Doc<TableName extends "jobs" | "files" | "folders"> =
  import("../../convex/_generated/dataModel").Doc<TableName>
type Overrides<TableName extends "jobs" | "files" | "folders"> = Partial<
  WithoutSystemFields<Doc<TableName>>
>

type FolderOverrides = Overrides<"folders">
export type FileOverrides = Overrides<"files">
type JobOverrides = Overrides<"jobs">

export function folderDoc(overrides: FolderOverrides = {}) {
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

export function fileDoc(overrides: FileOverrides = {}) {
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

export function jobDoc(overrides: JobOverrides = {}) {
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

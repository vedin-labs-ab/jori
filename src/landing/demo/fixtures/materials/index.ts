import { day, hour } from "../clock"
import { folderId } from "../folders"
import { demoId } from "../ids"
import { personId } from "../people"
import { type DemoFile, type DemoMaterial, type DemoStore } from "../types"
import { demoTables } from "./tables"

/** The materials filed across Copperline's folders: a table, a store, or a
 *  file per team, and the renewals table the whole page comes back to. */
export function demoMaterials(now: number): DemoMaterial[] {
  return [...demoTables(now), ...demoStores(now), ...demoFiles(now)]
}

function demoStores(now: number): DemoStore[] {
  return [
    store(now, "release", "Release state", "engineering", 4, 37, now - 3 * day),
    store(
      now,
      "watch",
      "Renewals watch state",
      "renewals",
      3,
      61,
      now - 5 * hour
    ),
  ]
}

function demoFiles(now: number): DemoFile[] {
  return [
    file({
      key: "notes",
      name: "Release notes 2.14.md",
      folder: "engineering",
      mimeType: "text/markdown",
      size: 12_480,
      updatedAt: now - 3 * day,
    }),
    file({
      key: "brief",
      name: "Launch brief.pdf",
      folder: "marketing",
      owner: "ida",
      mimeType: "application/pdf",
      size: 2_140_000,
      updatedAt: now - 2 * day,
    }),
    file({
      key: "forecast",
      name: "Q3 forecast.xlsx",
      folder: "finance",
      owner: "priya",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 348_000,
      updatedAt: now - 4 * hour,
    }),
    file({
      key: "onboarding",
      name: "Onboarding flow.png",
      folder: "design",
      owner: "hanna",
      mimeType: "image/png",
      size: 1_420_000,
      updatedAt: now - 2 * day,
    }),
  ]
}

function store(
  now: number,
  key: string,
  name: string,
  folder: string,
  propertyCount: number,
  version: number,
  updatedAt: number
): DemoStore {
  return {
    kind: "store",
    id: demoId("collections", key),
    name,
    description: "What the job carries between runs.",
    folderId: folderId(folder),
    visibility: { mode: "organization" },
    createdAt: now - 25 * day,
    updatedAt,
    propertyCount,
    version,
  }
}

function file(spec: {
  key: string
  name: string
  folder: string
  owner?: string
  mimeType: string
  size: number
  updatedAt: number
}): DemoFile {
  return {
    kind: "file",
    id: demoId("files", spec.key),
    name: spec.name,
    folderId: folderId(spec.folder),
    visibility: { mode: "organization" },
    ownerId: spec.owner === undefined ? undefined : personId(spec.owner),
    createdAt: spec.updatedAt - 2 * hour,
    updatedAt: spec.updatedAt,
    mimeType: spec.mimeType,
    size: spec.size,
    source: spec.owner === undefined ? "run" : "upload",
  }
}

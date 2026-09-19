import { type Doc } from "../../_generated/dataModel"
import { type QueryLikeCtx } from "../../shared/context"
import { type Sight } from "../../visibility/sight"
import { folderGate } from "../../visibility/target"
import { readable } from "./text"
import { type Source } from "./types"
export async function material(
  ctx: QueryLikeCtx,
  table: string,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  switch (table) {
    case "folders":
      return folder(ctx, id, sight)
    case "files":
      return file(ctx, id, sight)
    case "collections":
    case "documents":
      return collection(ctx, table, id, sight)
    default:
      return null
  }
}

async function folder(
  ctx: QueryLikeCtx,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const key = ctx.db.normalizeId("folders", id)
  const row = key ? await ctx.db.get(key) : null
  if (!row || (sight && !(await sight.canSeeFolder(row)))) {
    return null
  }
  return {
    organizationId: row.organizationId,
    sourceKey: `folders:${id}`,
    resourceKey: `folders:${id}`,
    authorityKey: `folders:${id}`,
    resourceId: id,
    kind: "folder",
    title: row.name,
    resourceName: row.name,
    updatedAt: row.updatedAt,
    gate: folderGate(row),
    sections: [
      { text: row.name, location: { kind: "resource", id, field: "name" } },
    ],
  }
}

async function file(
  ctx: QueryLikeCtx,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const key = ctx.db.normalizeId("files", id)
  const row = key ? await ctx.db.get(key) : null
  if (!row || (sight && !(await sight.canSee(row)))) {
    return null
  }
  return {
    organizationId: row.organizationId,
    sourceKey: `files:${id}`,
    resourceKey: `files:${id}`,
    authorityKey: `files:${id}`,
    resourceId: id,
    kind: "file",
    title: row.name,
    resourceName: row.name,
    updatedAt: row.updatedAt,
    gate: row,
    sections: [
      { text: row.name, location: { kind: "resource", id, field: "name" } },
    ],
    file: {
      blobKey: row.blobKey,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
    },
  }
}

async function collection(
  ctx: QueryLikeCtx,
  table: string,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const documentId =
    table === "documents" ? ctx.db.normalizeId("documents", id) : null
  const document = documentId ? await ctx.db.get(documentId) : null
  const collectionId =
    table === "collections"
      ? ctx.db.normalizeId("collections", id)
      : document?.collectionId
  const row = collectionId ? await ctx.db.get(collectionId) : null
  if (
    !row ||
    row.archivedAt !== undefined ||
    (table === "documents" && !document) ||
    (sight && !(await sight.canSee(row)))
  ) {
    return null
  }
  const key = `collections:${row._id}`
  const { title, sections } = collectionContent(row, document)

  return {
    organizationId: row.organizationId,
    sourceKey: `${table}:${id}`,
    resourceKey: key,
    authorityKey: key,
    resourceId: row._id,
    kind: row.kind,
    title: title.slice(0, 200),
    resourceName: row.name,
    updatedAt: document?.updatedAt ?? row.updatedAt,
    gate: row,
    sections,
  }
}

function collectionContent(
  row: Doc<"collections">,
  document: Doc<"documents"> | null
) {
  const fields =
    row.kind === "table"
      ? row.columns.map((column) => ({
          label: column.name,
          id: column.id,
          text: readable(document?.value?.[column.id]),
        }))
      : []
  const label = fields.find(
    (field) => /^(name|title|subject|label)$/i.test(field.label) && field.text
  )?.text
  const title = document
    ? label ||
      fields.find((field) => field.text && field.text.length <= 100)?.text ||
      row.name
    : row.name
  const sections = collectionSections(row, document, fields)
  return { title, sections }
}

function collectionSections(
  row: Doc<"collections">,
  document: Doc<"documents"> | null,
  fields: { label: string; id: string; text: string }[]
): Source["sections"] {
  return document
    ? row.kind === "table"
      ? fields.map((field) => ({
          text: field.text,
          location: {
            kind: "row" as const,
            id: document._id,
            field: field.id,
            label: field.label,
          },
        }))
      : [
          {
            text: readable(document.value),
            location: {
              kind: "row" as const,
              id: document._id,
              label: "Store value",
            },
          },
        ]
    : [
        {
          text: `${row.name}\n${row.kind === "table" ? row.columns.map((c) => c.name).join("\n") : readable(row.schema)}`,
          location: { kind: "resource" as const, id: row._id },
        },
      ]
}

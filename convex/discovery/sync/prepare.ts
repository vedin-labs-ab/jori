import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { sha256Hex } from "../../shared/crypto"
import { accessTokens, type Row, version } from "../provider"
import { spellingKeys } from "../provider/spelling"
import { chunks } from "../source/text"
import { type Projection, type Section } from "../source/types"
export type Prepared = {
  state: Doc<"discoverySources">
  source: Projection | null
  sections: Section[]
  rows: Row[]
  reuse: boolean
  textHash?: string
  fileKey?: string
  coverage?: string
  retryable?: boolean
}
export async function prepare(
  ctx: ActionCtx,
  state: Doc<"discoverySources">,
  source: Projection | null
): Promise<Prepared> {
  if (!source) {
    return { state, source, sections: [], rows: [], reuse: false }
  }
  const { sections, coverage, fileKey, retryable } = await fileSections(
    ctx,
    state,
    source
  )
  const textHash = await sha256Hex(
    JSON.stringify({
      version,
      title: source.title,
      resourceName: source.resourceName,
      sections,
    })
  )
  const reuse = textHash === state.textHash
  const prefix = (await sha256Hex(state.key)).slice(0, 40)
  const rows: Row[] = reuse
    ? []
    : sections.map((section, part) => ({
        id: `${prefix}-${part}`,
        key: state.key,
        revision: source.revision,
        resource: source.resourceKey,
        kind: source.kind,
        part,
        title: source.title,
        text: [
          source.resourceName,
          source.title,
          section.location.label,
          section.text,
        ]
          .filter(Boolean)
          .join("\n"),
        spelling: spellingKeys(source.title),
        access: accessTokens(source.gate),
        folder: source.gate.folderId ?? "root",
      }))
  return {
    state,
    source,
    sections,
    rows,
    reuse,
    textHash,
    fileKey,
    coverage,
    retryable,
  }
}

async function fileSections(
  ctx: ActionCtx,
  state: Doc<"discoverySources">,
  source: Projection
) {
  let sections = chunks(source.sections),
    coverage: string | undefined,
    fileKey: string | undefined,
    retryable = false
  if (source.file) {
    fileKey = fileIdentity(source)
    if (
      fileKey === state.fileKey &&
      state.parts &&
      state.coverage !== "failed"
    ) {
      const stored = await cached(ctx, state.key)
      if (stored.length === state.parts) {
        sections = [
          ...sections,
          ...stored.filter((p) => p.location.kind === "passage"),
        ]
        coverage = state.coverage
      } else {
        fileKey = undefined
      }
    }
    if (!fileKey || fileKey !== state.fileKey || !coverage) {
      const extracted = await extract(ctx, state, source)
      coverage = extracted.coverage
      retryable = extracted.retryable ?? false
      fileKey = retryable ? undefined : fileIdentity(source)
      sections.push(...extracted.sections)
    }
  }
  return { sections, coverage, fileKey, retryable }
}

async function cached(ctx: ActionCtx, key: string) {
  let after = -1
  const stored: Section[] = []
  while (true) {
    const page: Doc<"discoveryPassages">[] = await ctx.runQuery(
      internal.discovery.sync.state.cached,
      { key, after }
    )
    stored.push(...page.map((p) => ({ text: p.text, location: p.location })))
    if (page.length < 100) {
      break
    }
    after = page[page.length - 1].part
  }
  return stored
}

async function extract(
  ctx: ActionCtx,
  state: Doc<"discoverySources">,
  source: Projection
) {
  if (!source.file) {
    throw new Error("Missing file")
  }
  const extracted = await ctx.runAction(
    internal.discovery.extraction.index.extract,
    {
      storageId: source.file.storageId,
      organizationId: source.organizationId,
      sourceKey: state.key,
      revision: source.revision,
      fileName: source.file.name,
      mimeType: source.file.mimeType,
    }
  )
  return {
    coverage: extracted.coverage,
    retryable: extracted.retryable,
    sections: chunks(
      extracted.sections.map(
        (
          s: {
            text: string
            label?: string
            page?: number
            seconds?: number
            start?: number
            end?: number
            sheet?: string
            cell?: string
          },
          index: number
        ) => {
          const { text, ...location } = s
          return {
            text,
            location: {
              kind: "passage" as const,
              id: String(index),
              ...location,
            },
          }
        }
      )
    ),
  }
}

function fileIdentity(source: Projection) {
  return `${version}:${source.file?.storageId}:${source.file?.mimeType}:${source.file?.name.split(".").at(-1)?.toLowerCase()}`
}

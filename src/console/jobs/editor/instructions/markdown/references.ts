import { type JSONContent } from "@tiptap/core"
import {
  type JobMention,
  type JobMentionCatalog,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
  readJobMentions,
} from "@/shared/console/jobs/access"
import {
  isJobSurfacePolicyBlocked,
  type JobPolicyPermissions,
} from "@/shared/console/jobs/access/policy"
import { getDefaultJobSurfaceTools } from "@/shared/console/jobs/access/tools"
import { literalMarkdownMarkName } from "./literal"
import {
  fencedTextNodeName,
  jobReferenceNodeName,
  jobSurfaceNodeName,
  parseJobReferenceKind,
  parseJobSurfaceIntegration,
  parseJobSurfaceTools,
} from "./schema"

const inlineContainers = new Set(["fencedText", "heading", "paragraph"])

export function hydrateInstructionReferences({
  catalog,
  document,
  permissions,
  surfaces,
}: {
  catalog: JobMentionCatalog
  document: JSONContent
  permissions?: JobPolicyPermissions
  surfaces: JobSurfaceFormValue[]
}): JSONContent {
  const tools = new Map(
    surfaces.map((surface) => [surface.integration, surface.tools])
  )

  return hydrateNode(document, { catalog, permissions, tools })
}

type HydrationContext = {
  catalog: JobMentionCatalog
  permissions?: JobPolicyPermissions
  tools: Map<JobSurfaceIntegration, string[]>
}

function hydrateNode(
  node: JSONContent,
  context: HydrationContext
): JSONContent {
  if (node.type === "codeBlock" || node.content === undefined) {
    return node
  }

  const content = inlineContainers.has(node.type ?? "")
    ? hydrateInlineContent(node.content, context)
    : node.content.map((child) => hydrateNode(child, context))

  return { ...node, content }
}

function hydrateInlineContent(
  content: JSONContent[],
  context: HydrationContext
) {
  const hydrated: JSONContent[] = []
  let state: InlineHydrationState = {}

  for (const node of content) {
    if (node.type === "text" && node.text !== undefined) {
      const result = hydrateInlineText(node, state, context)
      hydrated.push(...result.content)
      state = result.state
      continue
    }

    hydrated.push(node)
    state = {
      previousCharacter: node.type === "hardBreak" ? "\n" : "\uFFFC",
    }
  }

  return hydrated
}

type InlineHydrationState = {
  previousCharacter?: string
  previousWasCode?: boolean
}

function hydrateInlineText(
  node: JSONContent,
  state: InlineHydrationState,
  context: HydrationContext
) {
  const text = node.text ?? ""
  const isLiteral =
    node.marks?.some((mark) => mark.type === literalMarkdownMarkName) ?? false
  const isCode = node.marks?.some((mark) => mark.type === "code") ?? false
  const prefix =
    isCode && !state.previousWasCode ? "x" : state.previousCharacter

  return {
    content: isLiteral ? [node] : hydrateText(node, prefix, context),
    state: {
      previousCharacter: text.at(-1) ?? state.previousCharacter,
      previousWasCode: isLiteral ? false : isCode,
    },
  }
}

function hydrateText(
  node: JSONContent,
  prefix: string | undefined,
  context: HydrationContext
) {
  const text = node.text ?? ""
  const scanPrefix = prefix ?? ""
  const scanText = scanPrefix + text
  const prefixLength = scanPrefix.length
  const mentions = readJobMentions(scanText, context.catalog).filter(
    (mention) => mention.start >= prefixLength
  )
  const content: JSONContent[] = []
  let cursor = 0

  for (const mention of mentions) {
    const start = mention.start - prefixLength
    const end = mention.end - prefixLength
    appendText(content, text.slice(cursor, start), node.marks)
    content.push(mentionNode(mention, node.marks, context))
    cursor = end
  }

  appendText(content, text.slice(cursor), node.marks)
  return content
}

function mentionNode(
  mention: JobMention,
  marks: JSONContent["marks"],
  context: HydrationContext
): JSONContent {
  if (mention.kind !== "integration") {
    return {
      type: jobReferenceNodeName,
      attrs: { id: mention.id, kind: mention.kind },
      marks,
    }
  }

  const integration = mention.id as JobSurfaceIntegration
  const tools =
    context.tools.get(integration) ??
    getDefaultJobSurfaceTools(integration, context.permissions)

  return {
    type: jobSurfaceNodeName,
    attrs: {
      integration,
      policy: isJobSurfacePolicyBlocked({
        permissions: context.permissions,
        surface: { integration, tools },
      })
        ? "blocked"
        : "allowed",
      tools,
    },
    marks,
  }
}

function appendText(
  content: JSONContent[],
  text: string,
  marks: JSONContent["marks"]
) {
  if (text !== "") {
    content.push({ type: "text", text, marks })
  }
}

export function readInstructionSurfaces(document: JSONContent) {
  const surfaces: JobSurfaceFormValue[] = []
  const seen = new Set<JobSurfaceIntegration>()

  visitDocument(document, (node) => {
    const integration = parseJobSurfaceIntegration(node.attrs?.integration)

    if (node.type !== jobSurfaceNodeName || integration === null) {
      return
    }
    if (!seen.has(integration)) {
      seen.add(integration)
      surfaces.push({
        integration,
        tools: parseJobSurfaceTools(node.attrs?.tools),
      })
    }
  })

  return surfaces
}

export function readInstructionReferences(document: JSONContent) {
  const references: Array<{ id: string; kind: "skill" | "tool" }> = []

  visitDocument(document, (node) => {
    const kind = parseJobReferenceKind(node.attrs?.kind)
    const id = node.attrs?.id

    if (
      node.type === jobReferenceNodeName &&
      kind !== null &&
      typeof id === "string"
    ) {
      references.push({ id, kind })
    }
  })

  return references
}

export function isReferenceEligibleContainer(nodeType: string) {
  return inlineContainers.has(nodeType) || nodeType === fencedTextNodeName
}

function visitDocument(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node)
  for (const child of node.content ?? []) {
    visitDocument(child, visit)
  }
}

import { type JSONContent } from "@tiptap/core"
import {
  emptyJobMentionCatalog,
  type JobMentionCatalog,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
} from "@/shared/console/jobs/access"
import {
  parseInstructionMarkdown,
  serializeInstructionMarkdown,
} from "./markdown/codec"
import {
  hydrateInstructionReferences,
  readInstructionSurfaces,
} from "./markdown/references"
import { jobSurfaceNodeName, parseJobSurfaceTools } from "./markdown/schema"
import { type JobInstructionsFieldProps } from "./types"

export {
  jobReferenceNodeName,
  jobSurfaceNodeName,
  parseJobReferenceKind,
  parseJobSurfaceIntegration,
  parseJobSurfaceTools,
} from "./markdown/schema"

export type JobInstructionsValue = {
  description: string
  surfaces: JobSurfaceFormValue[]
}

export function createJobInstructionDocument({
  catalog,
  description,
  permissions,
  surfaces,
}: JobInstructionsValue & {
  catalog: JobMentionCatalog
  permissions?: JobInstructionsFieldProps["permissions"]
}): JSONContent {
  return hydrateInstructionReferences({
    catalog,
    document: parseInstructionMarkdown(description),
    permissions,
    surfaces,
  })
}

export function serializeJobInstructionDocument(
  document: JSONContent
): JobInstructionsValue {
  return {
    description: serializeInstructionMarkdown(document),
    surfaces: readInstructionSurfaces(document),
  }
}

export function jobInstructionKey(value: JobInstructionsValue) {
  return JSON.stringify({
    description: value.description,
    surfaces: value.surfaces,
  })
}

export function readAdditionalJobSurfaces({
  description,
  surfaces,
}: JobInstructionsValue) {
  if (surfaces.length === 0) {
    return []
  }

  const mentioned = readMentionedIntegrations(description)

  return surfaces.filter((surface) => !mentioned.has(surface.integration))
}

function readMentionedIntegrations(description: string) {
  const document = createJobInstructionDocument({
    catalog: emptyJobMentionCatalog,
    description,
    surfaces: [],
  })
  const integrations = new Set(
    readInstructionSurfaces(document).map((surface) => surface.integration)
  )

  return integrations
}

export function mergeJobSurfaces(
  mentioned: JobSurfaceFormValue[],
  additional: JobSurfaceFormValue[]
) {
  const integrations = new Set(mentioned.map((surface) => surface.integration))

  return [
    ...mentioned,
    ...additional.filter((surface) => !integrations.has(surface.integration)),
  ]
}

export function readJobSurfaceToolsForIntegration(
  document: JSONContent,
  integration: JobSurfaceIntegration
): string[] | undefined {
  if (
    document.type === jobSurfaceNodeName &&
    document.attrs?.integration === integration
  ) {
    return parseJobSurfaceTools(document.attrs.tools)
  }

  for (const child of document.content ?? []) {
    const tools = readJobSurfaceToolsForIntegration(child, integration)

    if (tools !== undefined) {
      return tools
    }
  }

  return undefined
}

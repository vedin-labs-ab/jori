import { mergeAttributes, Node } from "@tiptap/core"
import {
  getJobSurfaceLabel,
  isJobSurfaceIntegration,
  type JobMentionKind,
  type JobScope,
  jobMentionText,
} from "../../../access"
import { type JobPolicyPermissions } from "../../../access/policy"

export const jobSurfaceNodeName = "jobSurface"
export const jobReferenceNodeName = "jobReference"
export const fencedTextNodeName = "fencedText"

const jobSurfacePolicyStates = ["allowed", "blocked"] as const
type JobSurfacePolicyState = (typeof jobSurfacePolicyStates)[number]

export type JobSurfaceNodeOptions = {
  getPermissions: () => JobPolicyPermissions
  getScope: () => JobScope
  getOrganizationId: () => string
}

export type JobReferenceNodeOptions = {
  getPermissions: () => JobPolicyPermissions
  getScope: () => JobScope
  getOrganizationId: () => string
  getWebSearch: () => boolean
}

export const JobSurfaceNode = Node.create<JobSurfaceNodeOptions>({
  name: jobSurfaceNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getPermissions: () => undefined,
      getScope: () => "personal",
      getOrganizationId: () => "",
    }
  },

  addAttributes() {
    return {
      integration: {
        default: null,
        parseHTML: (element) =>
          parseJobSurfaceIntegration(element.getAttribute("data-integration")),
        renderHTML: (attributes) => ({
          "data-integration": parseJobSurfaceIntegration(
            attributes.integration
          ),
        }),
      },
      tools: {
        default: [],
        parseHTML: (element) =>
          parseJobSurfaceToolsAttribute(element.getAttribute("data-tools")),
        renderHTML: (attributes) => ({
          "data-tools": parseJobSurfaceToolsAttribute(attributes.tools).join(
            ","
          ),
        }),
      },
      policy: {
        default: "allowed",
        parseHTML: (element) =>
          parseJobSurfacePolicy(element.getAttribute("data-policy")),
        renderHTML: (attributes) => ({
          "data-policy": parseJobSurfacePolicy(attributes.policy),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-job-surface]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const integration = parseJobSurfaceIntegration(node.attrs.integration)

    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-job-surface": "" }),
      integration === null ? "" : getJobSurfaceLabel(integration),
    ]
  },

  renderMarkdown(node) {
    const integration = parseJobSurfaceIntegration(node.attrs?.integration)

    return integration === null
      ? ""
      : jobMentionText("integration", integration)
  },
})

export const JobReferenceNode = Node.create<JobReferenceNodeOptions>({
  name: jobReferenceNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getPermissions: () => undefined,
      getScope: () => "personal",
      getOrganizationId: () => "",
      getWebSearch: () => false,
    }
  },

  addAttributes() {
    return {
      kind: {
        default: null,
        parseHTML: (element) =>
          parseJobReferenceKind(element.getAttribute("data-kind")),
        renderHTML: (attributes) => ({
          "data-kind": parseJobReferenceKind(attributes.kind),
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": typeof attributes.id === "string" ? attributes.id : null,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-job-reference]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-job-reference": "" }),
      serializeReferenceNode(node.attrs),
    ]
  },

  renderMarkdown(node) {
    return serializeReferenceNode(node.attrs)
  },
})

export function parseJobSurfaceIntegration(integration: unknown) {
  return isJobSurfaceIntegration(integration) ? integration : null
}

function parseJobSurfacePolicy(policy: unknown): JobSurfacePolicyState {
  return jobSurfacePolicyStates.some((state) => state === policy)
    ? (policy as JobSurfacePolicyState)
    : "allowed"
}

export function parseJobSurfaceTools(tools: unknown) {
  return Array.isArray(tools)
    ? tools.filter((tool): tool is string => typeof tool === "string")
    : []
}

function parseJobSurfaceToolsAttribute(tools: unknown) {
  return typeof tools === "string"
    ? tools.split(",").filter((tool) => tool !== "")
    : parseJobSurfaceTools(tools)
}

export function parseJobReferenceKind(
  kind: unknown
): Exclude<JobMentionKind, "integration"> | null {
  return kind === "skill" || kind === "tool" ? kind : null
}

function serializeReferenceNode(attrs: Record<string, unknown> | undefined) {
  const kind = parseJobReferenceKind(attrs?.kind)
  const id = attrs?.id

  return kind === null || typeof id !== "string" || id === ""
    ? ""
    : jobMentionText(kind, id)
}

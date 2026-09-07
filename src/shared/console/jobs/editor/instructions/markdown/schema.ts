import { mergeAttributes, Node } from "@tiptap/core"
import {
  MentionNode,
  mentionNodeName,
  mentionText,
} from "@/shared/console/mentions/node"
import {
  getJobSurfaceLabel,
  isJobSurfaceIntegration,
  type JobMentionKind,
  type JobScope,
} from "../../../access"
import { type JobPolicyPermissions } from "../../../access/policy"

export const jobSurfaceNodeName = "jobSurface"
/** A skill or tool mention is the shared mention node, under the job's
 *  own view and options. */
export const jobReferenceNodeName = mentionNodeName
export const fencedTextNodeName = "fencedText"

const jobSurfacePolicyStates = ["allowed", "blocked"] as const
type JobSurfacePolicyState = (typeof jobSurfacePolicyStates)[number]

export type JobSurfaceNodeOptions = {
  getPermissions: () => JobPolicyPermissions
  getScope: () => JobScope
}

export type JobReferenceNodeOptions = {
  getPermissions: () => JobPolicyPermissions
  getScope: () => JobScope
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

    return integration === null ? "" : mentionText("integration", integration)
  },
})

export const JobReferenceNode = MentionNode.extend<JobReferenceNodeOptions>({
  addOptions() {
    return {
      getPermissions: () => undefined,
      getScope: () => "personal",
      getWebSearch: () => false,
    }
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

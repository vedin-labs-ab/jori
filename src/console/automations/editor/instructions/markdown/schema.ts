import { type Scope } from "@contracts/permissions/scope"
import { mergeAttributes, Node } from "@tiptap/core"
import {
  type AutomationMentionKind,
  automationMentionText,
  getAutomationSurfaceLabel,
  isAutomationSurfaceIntegration,
} from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"

export const automationSurfaceNodeName = "automationSurface"
export const automationReferenceNodeName = "automationReference"
export const fencedTextNodeName = "fencedText"

const automationSurfacePolicyStates = ["allowed", "blocked"] as const
type AutomationSurfacePolicyState =
  (typeof automationSurfacePolicyStates)[number]

export type AutomationSurfaceNodeOptions = {
  getPermissions: () => AutomationPolicyPermissions
  getScope: () => Scope
  getTenantId: () => string
}

export type AutomationReferenceNodeOptions = {
  getPermissions: () => AutomationPolicyPermissions
  getScope: () => Scope
  getTenantId: () => string
  getWebSearch: () => boolean
}

export const AutomationSurfaceNode = Node.create<AutomationSurfaceNodeOptions>({
  name: automationSurfaceNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getPermissions: () => undefined,
      getScope: () => "personal",
      getTenantId: () => "",
    }
  },

  addAttributes() {
    return {
      integration: {
        default: null,
        parseHTML: (element) =>
          parseAutomationSurfaceIntegration(
            element.getAttribute("data-integration")
          ),
        renderHTML: (attributes) => ({
          "data-integration": parseAutomationSurfaceIntegration(
            attributes.integration
          ),
        }),
      },
      tools: {
        default: [],
        parseHTML: (element) =>
          parseAutomationSurfaceToolsAttribute(
            element.getAttribute("data-tools")
          ),
        renderHTML: (attributes) => ({
          "data-tools": parseAutomationSurfaceToolsAttribute(
            attributes.tools
          ).join(","),
        }),
      },
      policy: {
        default: "allowed",
        parseHTML: (element) =>
          parseAutomationSurfacePolicy(element.getAttribute("data-policy")),
        renderHTML: (attributes) => ({
          "data-policy": parseAutomationSurfacePolicy(attributes.policy),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-automation-surface]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const integration = parseAutomationSurfaceIntegration(
      node.attrs.integration
    )

    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-automation-surface": "" }),
      integration === null ? "" : getAutomationSurfaceLabel(integration),
    ]
  },

  renderMarkdown(node) {
    const integration = parseAutomationSurfaceIntegration(
      node.attrs?.integration
    )

    return integration === null
      ? ""
      : automationMentionText("integration", integration)
  },
})

export const AutomationReferenceNode =
  Node.create<AutomationReferenceNodeOptions>({
    name: automationReferenceNodeName,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addOptions() {
      return {
        getPermissions: () => undefined,
        getScope: () => "personal",
        getTenantId: () => "",
        getWebSearch: () => false,
      }
    },

    addAttributes() {
      return {
        kind: {
          default: null,
          parseHTML: (element) =>
            parseAutomationReferenceKind(element.getAttribute("data-kind")),
          renderHTML: (attributes) => ({
            "data-kind": parseAutomationReferenceKind(attributes.kind),
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
      return [{ tag: "span[data-automation-reference]" }]
    },

    renderHTML({ HTMLAttributes, node }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, { "data-automation-reference": "" }),
        serializeReferenceNode(node.attrs),
      ]
    },

    renderMarkdown(node) {
      return serializeReferenceNode(node.attrs)
    },
  })

export function parseAutomationSurfaceIntegration(integration: unknown) {
  return isAutomationSurfaceIntegration(integration) ? integration : null
}

function parseAutomationSurfacePolicy(
  policy: unknown
): AutomationSurfacePolicyState {
  return automationSurfacePolicyStates.some((state) => state === policy)
    ? (policy as AutomationSurfacePolicyState)
    : "allowed"
}

export function parseAutomationSurfaceTools(tools: unknown) {
  return Array.isArray(tools)
    ? tools.filter((tool): tool is string => typeof tool === "string")
    : []
}

function parseAutomationSurfaceToolsAttribute(tools: unknown) {
  return typeof tools === "string"
    ? tools.split(",").filter((tool) => tool !== "")
    : parseAutomationSurfaceTools(tools)
}

export function parseAutomationReferenceKind(
  kind: unknown
): Exclude<AutomationMentionKind, "integration"> | null {
  return kind === "skill" || kind === "tool" ? kind : null
}

function serializeReferenceNode(attrs: Record<string, unknown> | undefined) {
  const kind = parseAutomationReferenceKind(attrs?.kind)
  const id = attrs?.id

  return kind === null || typeof id !== "string" || id === ""
    ? ""
    : automationMentionText(kind, id)
}

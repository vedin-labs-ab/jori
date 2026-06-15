import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import {
  type AutomationSurfaceProvider,
  getAutomationSurfaceLabel,
} from "../../../surface"
import { type AutomationPolicyPermissions } from "../../../surface/policy"
import {
  type AutomationSurfacePolicyState,
  automationSurfaceNodeName,
  parseAutomationSurfacePolicy,
  parseAutomationSurfaceProvider,
  parseAutomationSurfaceToolsAttribute,
} from "../document"
import { AutomationSurfaceNodeView } from "../surface/node"

export type AutomationSurfaceNodeAttrs = {
  policy: AutomationSurfacePolicyState
  provider: AutomationSurfaceProvider
  tools: string[]
}

export type AutomationSurfaceExtensionOptions = {
  getPermissions: () => AutomationPolicyPermissions
}

export const AutomationSurfaceExtension =
  Node.create<AutomationSurfaceExtensionOptions>({
    name: automationSurfaceNodeName,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addOptions() {
      return {
        getPermissions: () => undefined,
      }
    },

    addAttributes() {
      return {
        provider: {
          default: null,
          parseHTML: (element) =>
            parseAutomationSurfaceProvider(
              element.getAttribute("data-provider")
            ),
          renderHTML: (attributes) => ({
            "data-provider": parseAutomationSurfaceProvider(
              attributes.provider
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
      const provider = parseAutomationSurfaceProvider(node.attrs.provider)

      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          "data-automation-surface": "",
        }),
        provider === null ? "" : getAutomationSurfaceLabel(provider),
      ]
    },

    addNodeView() {
      return ReactNodeViewRenderer(AutomationSurfaceNodeView)
    },
  })

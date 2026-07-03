import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { getAutomationSurfaceLabel } from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { AutomationSurfaceNodeView } from "../access/node"
import {
  automationSurfaceNodeName,
  parseAutomationSurfaceIntegration,
  parseAutomationSurfacePolicy,
  parseAutomationSurfaceToolsAttribute,
} from "../document"

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
        mergeAttributes(HTMLAttributes, {
          "data-automation-surface": "",
        }),
        integration === null ? "" : getAutomationSurfaceLabel(integration),
      ]
    },

    addNodeView() {
      return ReactNodeViewRenderer(AutomationSurfaceNodeView)
    },
  })

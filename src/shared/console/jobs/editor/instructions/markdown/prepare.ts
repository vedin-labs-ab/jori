import { type JSONContent } from "@tiptap/core"
import {
  mentionNodeName,
  mentionText,
  readMentionAttributes,
} from "@/shared/console/mentions/node"
import { serializedCodeSpanNodeName } from "./fence"
import { jobSurfaceNodeName, parseJobSurfaceIntegration } from "./schema"

type SerializationContext = {
  index: number
  references: Map<string, string>
  salt: number
}

export function prepareInstructionSerialization(document: JSONContent) {
  const context: SerializationContext = {
    index: 0,
    references: new Map(),
    salt: availableSalt(documentText(document)),
  }

  return {
    document: transformNode(document, context),
    references: context.references,
  }
}

function transformNode(
  node: JSONContent,
  context: SerializationContext
): JSONContent {
  const reference = serializedReference(node)

  if (reference !== null) {
    return {
      type: "text",
      text: referencePlaceholder(reference, context),
      marks: node.marks,
    }
  }

  return node.content === undefined
    ? node
    : { ...node, content: transformContent(node.content, context) }
}

function transformContent(
  content: JSONContent[],
  context: SerializationContext
) {
  const transformed: JSONContent[] = []

  for (let index = 0; index < content.length; index += 1) {
    const node = content[index]

    if (!hasCodeMark(node)) {
      transformed.push(transformNode(node, context))
      continue
    }

    const codeNodes = [node]
    while (hasCodeMark(content[index + 1])) {
      index += 1
      codeNodes.push(content[index])
    }
    transformed.push({
      type: serializedCodeSpanNodeName,
      attrs: {
        content: codeNodes
          .map((child) => codeNodeText(child, context))
          .join(""),
      },
    })
  }

  return transformed
}

function codeNodeText(node: JSONContent, context: SerializationContext) {
  const reference = serializedReference(node)

  if (reference !== null) {
    return referencePlaceholder(reference, context)
  }
  if (node.type === "hardBreak") {
    return "\n"
  }

  return node.text ?? documentText(node)
}

function hasCodeMark(node: JSONContent | undefined) {
  return node?.marks?.some((mark) => mark.type === "code") ?? false
}

function referencePlaceholder(
  reference: string,
  context: SerializationContext
) {
  const placeholder = `\uE000${context.salt}:${context.index}\uE001`
  context.index += 1
  context.references.set(placeholder, reference)
  return placeholder
}

function serializedReference(node: JSONContent) {
  if (node.type === jobSurfaceNodeName) {
    const integration = parseJobSurfaceIntegration(node.attrs?.integration)
    return integration === null ? "" : mentionText("integration", integration)
  }

  if (node.type !== mentionNodeName) {
    return null
  }

  const mention = readMentionAttributes(node.attrs)

  return mention === null ? "" : mentionText(mention.kind, mention.id)
}

function availableSalt(occupiedText: string) {
  let salt = 0

  while (occupiedText.includes(`\uE000${salt}:`)) {
    salt += 1
  }

  return salt
}

function documentText(node: JSONContent): string {
  return `${node.text ?? ""}${(node.content ?? []).map(documentText).join("")}`
}

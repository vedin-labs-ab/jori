import { type ResolvedPos } from "@tiptap/pm/model"
import { literalMarkdownMarkName } from "../markdown/literal"
import { isReferenceEligibleContainer } from "../markdown/references"

export function isReferenceInputAllowed(
  position: ResolvedPos,
  mentionStart: number
) {
  if (!isReferenceEligibleContainer(position.parent.type.name)) {
    return false
  }

  let codeStartedAt = -1
  let previousWasCode = false
  let allowed = true

  position.parent.forEach((node, offset) => {
    const isCode = node.marks.some((mark) => mark.type.name === "code")
    const isLiteral = node.marks.some(
      (mark) => mark.type.name === literalMarkdownMarkName
    )

    if (isCode && !previousWasCode) {
      codeStartedAt = offset
    }
    if (offset <= mentionStart && mentionStart < offset + node.nodeSize) {
      allowed = !isLiteral && !(isCode && mentionStart === codeStartedAt)
    }
    previousWasCode = isCode
  })

  return allowed
}

import {
  Code2,
  FileText,
  type LucideIcon,
  MessagesSquare,
  PencilLine,
  Search,
  Sparkles,
} from "lucide-react"

export function getSkillIcon(category: string): LucideIcon {
  const normalizedCategory = category.trim().toLowerCase()

  if (
    /(communication|message|slack|collaboration|support|customer)/.test(
      normalizedCategory
    )
  ) {
    return MessagesSquare
  }

  if (/(code|engineering|developer|review)/.test(normalizedCategory)) {
    return Code2
  }

  if (/(write|writing|copy|editorial)/.test(normalizedCategory)) {
    return PencilLine
  }

  if (/(document|file|analysis|knowledge)/.test(normalizedCategory)) {
    return FileText
  }

  if (/(research|search|web)/.test(normalizedCategory)) {
    return Search
  }

  return Sparkles
}

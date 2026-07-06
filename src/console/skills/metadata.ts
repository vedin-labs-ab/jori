import { type SkillCategory } from "@contracts/skills"
import {
  type LucideIcon,
  MessagesSquare,
  Shapes,
  Telescope,
  Workflow,
} from "lucide-react"

export const skillCategoryIcons = {
  communication: MessagesSquare,
  creation: Shapes,
  operations: Workflow,
  research: Telescope,
} satisfies Record<SkillCategory, LucideIcon>

import { type SkillCategory, type SkillSurface } from "@contracts/skills"
import { type GenericId } from "convex/values"

export type Skill = {
  _id: GenericId<"skills">
  organizationId: string | null
  name: string
  category: SkillCategory
  surfaces: SkillSurface[]
  description: string
  body: string
  createdAt: number
  updatedAt: number
  scope: "global" | "organization"
}

export type SkillFormValues = {
  name: string
  category: SkillCategory
  surfaces: SkillSurface[]
  description: string
  body: string
}

export type SkillFilterView = "all" | "organization" | "global"

export const skillFilterOptions = [
  { label: "All", value: "all" },
  { label: "Organization", value: "organization" },
  { label: "Global", value: "global" },
] satisfies Array<{ label: string; value: SkillFilterView }>

export const emptySkillForm: SkillFormValues = {
  name: "",
  category: "operations",
  surfaces: [],
  description: "",
  body: "",
}

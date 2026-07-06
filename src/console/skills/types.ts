import { type Integration } from "@contracts/integrations"
import { type SkillCategory } from "@contracts/skills"
import { type GenericId } from "convex/values"

export type Skill = {
  _id: GenericId<"skills">
  tenantId: string | null
  name: string
  category: SkillCategory
  associatedIntegrations: Integration[]
  description: string
  body: string
  createdAt: number
  updatedAt: number
  scope: "global" | "tenant"
}

export type SkillFormValues = {
  name: string
  category: SkillCategory
  associatedIntegrations: Integration[]
  description: string
  body: string
}

export type SkillFilterView = "all" | "tenant" | "global"

export const skillFilterOptions = [
  { label: "All", value: "all" },
  { label: "Organization", value: "tenant" },
  { label: "Global", value: "global" },
] satisfies Array<{ label: string; value: SkillFilterView }>

export const emptySkillForm: SkillFormValues = {
  name: "",
  category: "operations",
  associatedIntegrations: [],
  description: "",
  body: "",
}

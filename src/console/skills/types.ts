import { type GenericId } from "convex/values"

export type Skill = {
  _id: GenericId<"skills">
  tenantId: string | null
  name: string
  description: string
  body: string
  createdAt: number
  updatedAt: number
  enabled: boolean
  scope: "global" | "tenant"
}

export type SkillFormValues = {
  name: string
  description: string
  body: string
}

export type SkillFilterView = "all" | "tenant" | "global"

export const emptySkillForm: SkillFormValues = {
  name: "",
  description: "",
  body: "",
}

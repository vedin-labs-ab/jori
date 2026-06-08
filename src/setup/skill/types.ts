import { type GenericId } from "convex/values"

export type Skill = {
  _id: GenericId<"skills">
  tenantId: string | null
  name: string
  description: string
  body: string
  scope: "global" | "tenant"
}

export type SkillFormValues = {
  name: string
  description: string
  body: string
}

export const emptySkillForm: SkillFormValues = {
  name: "",
  description: "",
  body: "",
}

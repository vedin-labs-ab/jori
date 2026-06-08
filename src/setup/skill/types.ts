import { type Id } from "../../../convex/_generated/dataModel"

export type Skill = {
  _id: Id<"skills">
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

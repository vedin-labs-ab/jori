import { type Integration } from "@contracts/integrations"
import { type GenericId } from "convex/values"

export type Skill = {
  _id: GenericId<"skills">
  tenantId: string | null
  name: string
  category: string
  associatedIntegrations: Integration[]
  description: string
  body: string
  createdAt: number
  updatedAt: number
  enabled: boolean
  scope: "global" | "tenant"
}

export type SkillFormValues = {
  name: string
  category: string
  associatedIntegrations: Integration[]
  description: string
  body: string
}

export type SkillFilterView = "all" | "tenant" | "global"

export const emptySkillForm: SkillFormValues = {
  name: "",
  category: "",
  associatedIntegrations: [],
  description: "",
  body: "",
}

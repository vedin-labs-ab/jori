import { v } from "convex/values"

export const sourceMetadataItemValidator = v.object({
  type: v.string(),
  label: v.string(),
  url: v.optional(v.string()),
})

export const sourceMetadataValidator = v.array(sourceMetadataItemValidator)

export type SourceMetadataItem = {
  type: string
  label: string
  url?: string
}

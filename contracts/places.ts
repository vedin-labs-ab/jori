// The place vocabulary shared by the prompt renderer and the console: one
// canonical section order, one label per section, one surface-native noun
// per integration that can host places.
export const placeSections = [
  "purpose",
  "people",
  "language",
  "rhythm",
  "milo",
] as const

export type PlaceSection = (typeof placeSections)[number]

export const placeSectionLabels: Record<PlaceSection, string> = {
  purpose: "Purpose",
  people: "People",
  language: "Language and tone",
  rhythm: "Operating rhythm",
  milo: "Milo's role here",
}

export const placeKinds = {
  slack: { label: "Channel", noun: "channel" },
  github: { label: "Repository", noun: "repository" },
  linear: { label: "Team", noun: "team" },
} as const

export type PlaceIntegration = keyof typeof placeKinds

export function placeDisplayName(integration: PlaceIntegration, name: string) {
  return integration === "slack" ? `#${name}` : name
}

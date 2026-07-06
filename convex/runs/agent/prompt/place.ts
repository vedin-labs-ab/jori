import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type PlaceContext } from "../../../places/context"
import { type PlaceSection, placeSections } from "../../../places/schema"
import { type MessageIntegration } from "../../../shared/integrations"
import { type AgentRuntimeInput } from "../input"

// The place message: claims about the durable container the triggering
// message landed in, delivered as data alongside the run prompt. The layer
// is generic; the heading speaks the surface's own language.
const placeLabels: Record<MessageIntegration, { label: string; noun: string }> =
  {
    slack: { label: "Channel", noun: "channel" },
    github: { label: "Repository", noun: "repository" },
    linear: { label: "Team", noun: "team" },
  }

const sectionTitles: Record<PlaceSection, string> = {
  purpose: "Purpose",
  people: "People",
  language: "Language and tone",
  rhythm: "Operating rhythm",
  milo: "Milo's role here",
}

export function createPlaceMessage(input: AgentRuntimeInput) {
  if (input.type !== "message" || input.place === null) {
    return ""
  }

  const labels = placeLabels[input.messageIntegration]

  return renderPromptTemplate(promptTemplates["agent/place"], {
    place: {
      label: labels.label,
      noun: labels.noun,
      name: placeName(input.messageIntegration, input.place.name),
      sections: sectionValues(input.place),
    },
  }).trim()
}

function placeName(integration: MessageIntegration, name: string) {
  return integration === "slack" ? `#${name}` : name
}

function sectionValues(place: PlaceContext) {
  return placeSections.flatMap((section) => {
    const claims = place.claims
      .filter((claim) => claim.section === section)
      .map((claim) => claim.text)

    return claims.length === 0
      ? []
      : [{ title: sectionTitles[section], claims }]
  })
}

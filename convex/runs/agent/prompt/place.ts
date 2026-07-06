import {
  placeDisplayName,
  placeKinds,
  placeSectionLabels,
  placeSections,
} from "../../../../contracts/places"
import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type PlaceContext } from "../../../places/context"
import { type AgentRuntimeInput } from "../input"

// The place message: claims about the durable container the triggering
// message landed in, delivered as data alongside the run prompt. The layer
// is generic; the heading speaks the surface's own language via the shared
// place vocabulary in contracts.
export function createPlaceMessage(input: AgentRuntimeInput) {
  if (input.type !== "message" || input.place === null) {
    return ""
  }

  const kind = placeKinds[input.messageIntegration]

  return renderPromptTemplate(promptTemplates["agent/place"], {
    place: {
      label: kind.label,
      noun: kind.noun,
      name: placeDisplayName(input.messageIntegration, input.place.name),
      sections: sectionValues(input.place),
    },
  }).trim()
}

function sectionValues(place: PlaceContext) {
  return placeSections.flatMap((section) => {
    const claims = place.claims
      .filter((claim) => claim.section === section)
      .map((claim) => claim.text)

    return claims.length === 0
      ? []
      : [{ title: placeSectionLabels[section], claims }]
  })
}

import { describe, expect, test } from "vitest"
import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type Integration, integrationLabels } from "../shared/integrations"
import { renderPlaybookInstructions } from "./instructions"

const recipient = { email: "sam@example.com", name: "Sam Doe" }

const providerFamilies = [
  { email: "gmail", calendar: "googleCalendar" },
  { email: "microsoftEmail", calendar: "microsoftCalendar" },
] satisfies Record<PlaybookCapability, Integration>[]

describe("playbook instructions", () => {
  test("every playbook renders with each slot's provider and the recipient", () => {
    for (const playbook of playbookCatalog) {
      for (const family of providerFamilies) {
        const providers = {
          email: integrationLabels[family.email],
          calendar: integrationLabels[family.calendar],
        }
        const instructions = renderPlaybookInstructions({
          key: playbook.key,
          providers,
          recipient,
        })

        expect(instructions).not.toContain("undefined")
        expect(instructions).toContain(`${recipient.name} <${recipient.email}>`)
        for (const slot of playbook.slots) {
          expect(instructions).toContain(providers[slot.capability])
        }
      }
    }
  })

  test("recipient without a name renders as a bare address", () => {
    const instructions = renderPlaybookInstructions({
      key: "morning-brief",
      providers: { email: "Gmail", calendar: "Google Calendar" },
      recipient: { email: "sam@example.com" },
    })

    expect(instructions).toContain("to sam@example.com")
    expect(instructions).not.toContain("<sam@example.com>")
  })

  test("unknown playbook keys are rejected", () => {
    expect(() =>
      renderPlaybookInstructions({
        key: "missing",
        providers: { email: "Gmail", calendar: "Google Calendar" },
        recipient,
      })
    ).toThrow("No instruction template")
  })
})

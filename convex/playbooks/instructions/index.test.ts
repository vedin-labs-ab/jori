import { describe, expect, test } from "vitest"
import { type PlaybookCapability } from "../../../contracts/playbooks/capabilities"
import { playbookCatalog } from "../../../contracts/playbooks/catalog"
import { resolvePlaybookOptions } from "../../../contracts/playbooks/options"
import {
  emailDestination,
  renderPlaybook,
} from "../../../test/convex/playbooks"
import { type Integration, integrationLabels } from "../../shared/integrations"
import { renderPlaybookInstructions } from "./index"

const providerFamilies = [
  { email: "gmail", calendar: "googleCalendar" },
  { email: "microsoftEmail", calendar: "microsoftCalendar" },
] satisfies Record<PlaybookCapability, Integration>[]

describe("playbook instructions", () => {
  test("every playbook renders its providers and destination", () => {
    for (const playbook of playbookCatalog) {
      for (const family of providerFamilies) {
        const providers = {
          email: integrationLabels[family.email],
          calendar: integrationLabels[family.calendar],
        }
        const instructions = renderPlaybookInstructions({
          definition: playbook,
          providers,
          destination: emailDestination,
          options: resolvePlaybookOptions(playbook.setup),
        })

        expect(instructions).not.toContain("undefined")
        expect(instructions).toContain(emailDestination.address)
        for (const slot of playbook.slots) {
          expect(instructions).toContain(`@${providers[slot.capability]}`)
        }
      }
    }
  })

  test("renders email and Slack routes with stable identifiers", () => {
    expect(renderPlaybook("morning-brief")).toContain(
      'to Sam Doe <sam@example.com> with the subject "Morning brief"'
    )
    expect(
      renderPlaybook("morning-brief", {
        kind: "slack",
        target: { kind: "dm", id: "U1", label: "Sam Doe" },
      })
    ).toContain("to me in a Slack DM using my Slack user ID U1 via @Slack")
  })

  test("keeps Slack labels outside the tool namespace", () => {
    const instructions = renderPlaybook("morning-brief", {
      kind: "slack",
      target: { kind: "channel", id: "C1", label: "share_app" },
    })

    expect(instructions).toContain('the "share_app" Slack channel')
    expect(instructions).not.toContain("#share_app")
  })

  test("rejects unknown playbook keys", () => {
    expect(() => renderPlaybook("missing")).toThrow("Unknown playbook.")
  })

  test("every catalog template id resolves to a compiled template", () => {
    for (const playbook of playbookCatalog) {
      expect(() =>
        renderPlaybookInstructions({
          definition: { ...playbook, template: "playbooks/missing" },
          providers: { email: "Gmail", calendar: "Google Calendar" },
          destination: emailDestination,
        })
      ).toThrow("Unknown playbook template")
      expect(
        renderPlaybookInstructions({
          definition: playbook,
          providers: { email: "Gmail", calendar: "Google Calendar" },
          destination: emailDestination,
          options: resolvePlaybookOptions(playbook.setup),
        })
      ).not.toBe("")
    }
  })
})

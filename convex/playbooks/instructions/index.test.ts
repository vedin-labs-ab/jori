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
          key: playbook.key,
          providers,
          destination: emailDestination,
          subject: playbook.title,
          noun: playbook.delivery.noun,
          style: playbook.delivery.style,
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
    ).toContain("to Sam Doe in a Slack DM using user ID U1 via @Slack")
  })

  test("keeps Slack labels outside the tool namespace", () => {
    const instructions = renderPlaybook("morning-brief", {
      kind: "slack",
      target: { kind: "channel", id: "C1", label: "share_artifact" },
    })

    expect(instructions).toContain('the "share_artifact" Slack channel')
    expect(instructions).not.toContain("#share_artifact")
  })

  test("rejects unknown playbook keys", () => {
    expect(() => renderPlaybook("missing")).toThrow("No instruction template")
  })
})

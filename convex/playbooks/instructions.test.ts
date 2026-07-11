import { describe, expect, test } from "vitest"
import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type DeliveryDestination } from "../../contracts/playbooks/delivery"
import { type Integration, integrationLabels } from "../shared/integrations"
import { renderPlaybookInstructions } from "./instructions"

const emailDestination: DeliveryDestination = {
  kind: "email",
  integration: "gmail",
  address: "Sam Doe <sam@example.com>",
}

const providerFamilies = [
  { email: "gmail", calendar: "googleCalendar" },
  { email: "microsoftEmail", calendar: "microsoftCalendar" },
] satisfies Record<PlaybookCapability, Integration>[]

function render(key: string, destination: DeliveryDestination) {
  const definition = playbookCatalog.find((entry) => entry.key === key)

  return renderPlaybookInstructions({
    key,
    providers: { email: "Gmail", calendar: "Google Calendar" },
    destination,
    subject: definition?.title ?? key,
    noun: definition?.delivery.noun ?? "output",
    style: definition?.delivery.style,
  })
}

describe("playbook instructions", () => {
  test("every playbook renders with each slot's provider and the destination", () => {
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
        })

        expect(instructions).not.toContain("undefined")
        expect(instructions).toContain(emailDestination.address)
        for (const slot of playbook.slots) {
          expect(instructions).toContain(providers[slot.capability])
        }
      }
    }
  })

  test("an email destination renders the address and subject", () => {
    const instructions = render("morning-brief", emailDestination)

    expect(instructions).toContain("to Sam Doe <sam@example.com>")
    expect(instructions).toContain('subject "Morning brief"')
  })

  test("a slack destination posts to the channel instead of emailing", () => {
    const instructions = render("morning-brief", {
      kind: "slack",
      channelId: "C1",
      channelName: "standup",
    })

    expect(instructions).toContain("Post the brief to #standup via Slack")
    expect(instructions).not.toContain("Email")
  })

  test("unknown playbook keys are rejected", () => {
    expect(() => render("missing", emailDestination)).toThrow(
      "No instruction template"
    )
  })

  test("meeting prep plans one-shot runs that share the dossier", () => {
    const instructions = render("meeting-prep", emailDestination)

    expect(instructions).toContain("add_automation")
    expect(instructions).toContain("start minus 45 minutes")
    expect(instructions).toContain("share_artifact")
    expect(instructions).toContain(
      'Email a short summary of the prep note from my Gmail to Sam Doe <sam@example.com> with the subject "Meeting prep"'
    )
  })

  test("meeting prep summarizes with a link on slack too", () => {
    const instructions = render("meeting-prep", {
      kind: "slack",
      channelId: "C1",
      channelName: "standup",
    })

    expect(instructions).toContain(
      "Post a short summary of the prep note to #standup via Slack, with the link to the full prep note."
    )
  })
})

import { describe, expect, test } from "vitest"
import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type DeliveryDestination } from "../../contracts/playbooks/delivery"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "../../contracts/playbooks/options"
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

function render(
  key: string,
  destination: DeliveryDestination,
  options: PlaybookOptionValues = {}
) {
  const definition = playbookCatalog.find((entry) => entry.key === key)

  return renderPlaybookInstructions({
    key,
    providers: { email: "Gmail", calendar: "Google Calendar" },
    destination,
    subject: definition?.title ?? key,
    noun: definition?.delivery.noun ?? "output",
    style: definition?.delivery.style,
    options: resolvePlaybookOptions(definition?.options, options),
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
          options: resolvePlaybookOptions(playbook.options),
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
})

describe("meeting prep instructions", () => {
  test("meeting prep defaults to a digest with prep sends", () => {
    const instructions = render("meeting-prep", emailDestination)

    expect(instructions).toContain("start_agent")
    expect(instructions).toContain("at 07:30 today")
    expect(instructions).toContain('name "Meeting digest"')
    expect(instructions).toContain("start minus 45 minutes")
    expect(instructions).toContain('name "Prep: "')
    expect(instructions).toContain("share_artifact")
    expect(instructions).toContain(
      'Email a short summary of the prep note from my Gmail to Sam Doe <sam@example.com> with the subject "Meeting prep"'
    )
    // With a digest run behind it, the prep send refreshes the dossier it
    // finds and never falls back to prepping inline.
    expect(instructions).toContain(
      "If the dossier at days -> <YYYY-MM-DD> -> <event id> is missing"
    )
    expect(instructions).not.toContain("do the prep yourself now")
  })

  test("pre-meeting sends switch off cleanly", () => {
    const instructions = render("meeting-prep", emailDestination, {
      before: "off",
    })

    expect(instructions).toContain('name "Meeting digest"')
    expect(instructions).not.toContain('name "Prep: "')
  })

  test("without a digest the prep sends carry the research", () => {
    const instructions = render("meeting-prep", emailDestination, {
      digest: "off",
      before: "60",
    })

    expect(instructions).toContain("start minus 60 minutes")
    expect(instructions).toContain('name "Prep: "')
    expect(instructions).toContain("do the prep yourself now")
    expect(instructions).not.toContain("start_agent")
    expect(instructions).not.toContain("Meeting digest")
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

describe("meeting prep scope", () => {
  test("meeting scope gates attendee composition, not judgment", () => {
    const external = render("meeting-prep", emailDestination)
    const both = render("meeting-prep", emailDestination, {
      meetings: "both",
    })
    const internal = render("meeting-prep", emailDestination, {
      meetings: "internal",
    })

    expect(both).toContain("external or customer meetings")
    // External is the catalog default, so the bare render pins it.
    expect(external).toContain(
      "Only meetings that include people outside my organization qualify"
    )
    expect(internal).toContain(
      "Only meetings where everyone is part of my organization qualify"
    )
    for (const instructions of [both, external, internal]) {
      expect(instructions).toContain("Skip focus blocks")
      expect(instructions).toContain("preparation pays off")
    }
  })
})

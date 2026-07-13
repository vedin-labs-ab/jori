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

const meetingPrepReferences = [
  "#start_agent",
  "#wait_for_agents",
  "#add_automation",
  "#read_artifact_state",
  "#update_artifact_state",
  "#share_artifact",
]

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
    agentWait: definition?.agentWait,
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
          agentWait: playbook.agentWait,
        })

        expect(instructions).not.toContain("undefined")
        expect(instructions).toContain(emailDestination.address)
        for (const slot of playbook.slots) {
          expect(instructions).toContain(`@${providers[slot.capability]}`)
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
      target: { kind: "channel", id: "C1", label: "standup" },
    })

    expect(instructions).toContain(
      'Post the brief to the "standup" Slack channel using channel ID C1 via @Slack'
    )
    expect(instructions).not.toContain("Email")
  })

  test("a slack DM destination sends to the stable user id", () => {
    const instructions = render("morning-brief", {
      kind: "slack",
      target: { kind: "dm", id: "U1", label: "Sam Doe" },
    })

    expect(instructions).toContain(
      "Send the brief to Sam Doe in a Slack DM using user ID U1 via @Slack"
    )
    expect(instructions).not.toContain("Email")
  })

  test("unknown playbook keys are rejected", () => {
    expect(() => render("missing", emailDestination)).toThrow(
      "No instruction template"
    )
  })
})

describe("playbook instruction references", () => {
  test.each(meetingPrepReferences)("uses the %s reference", (reference) => {
    const instructions = render("meeting-prep", emailDestination)

    expect(instructions).toContain(reference)
    expect(instructions.replaceAll(reference, "")).not.toContain(
      reference.slice(1)
    )
  })

  test("keeps Slack channels outside the tool namespace", () => {
    const instructions = render("morning-brief", {
      kind: "slack",
      target: { kind: "channel", id: "C1", label: "share_artifact" },
    })

    expect(instructions).toContain(
      'to the "share_artifact" Slack channel using channel ID C1 via @Slack'
    )
    expect(instructions).not.toContain("#share_artifact")
  })
})

describe("meeting prep Markdown", () => {
  test("uses canonical plain-text fences and Markdown-safe placeholders", () => {
    const instructions = render("meeting-prep", emailDestination)

    expect(instructions.match(/```txt/g)).toHaveLength(2)
    expect(instructions).not.toContain('"""')
    expect(instructions).toContain("`<title>`")
    expect(instructions).toContain("`<local time>`")
    expect(instructions).toContain("`<event id>`")
    expect(instructions).toContain("`<artifact id>`")
    expect(instructions).toContain("`#d=<YYYY-MM-DD>&m=<event id>`")
  })
})

describe("meeting prep instructions", () => {
  test("meeting prep defaults to a digest with prep sends", () => {
    const instructions = render("meeting-prep", emailDestination)

    expect(instructions).toContain('timeout: { unit: "minutes", value: 15 }')
    expect(instructions).not.toContain("deadline")
    expect(instructions).toContain("#wait_for_agents")
    expect(instructions).toContain("start minus 45 minutes")
    expect(instructions).toContain("name `Prep: <title>`")
    expect(instructions).toContain(
      'Email a short summary of the prep note from my @Gmail to Sam Doe <sam@example.com> with the subject "Meeting prep"'
    )
    expect(instructions).toContain("anything newer than `preparedAt`")
    expect(instructions).not.toContain("do the prep yourself now")
    expect(instructions).toContain("fragment `#d=<YYYY-MM-DD>&m=<event id>`")
    expect(instructions).toContain("create a 24-hour #share_artifact link")
    expect(instructions).toContain("Narrow `tools`")
  })

  test("pre-meeting sends switch off cleanly", () => {
    const instructions = render("meeting-prep", emailDestination, {
      before: "off",
    })

    expect(instructions).toContain("#wait_for_agents")
    expect(instructions).not.toContain("name `Prep: <title>`")
  })

  test("without a digest the prep sends carry the research", () => {
    const instructions = render("meeting-prep", emailDestination, {
      digest: "off",
      before: "60",
    })

    expect(instructions).toContain("start minus 60 minutes")
    expect(instructions).toContain("name `Prep: <title>`")
    expect(instructions).toContain("yourself now using the same steps")
    expect(instructions).not.toContain("#start_agent")
    expect(instructions).not.toContain("Meeting digest")
  })

  test("meeting prep summarizes with a link on slack too", () => {
    const instructions = render("meeting-prep", {
      kind: "slack",
      target: { kind: "channel", id: "C1", label: "standup" },
    })

    expect(instructions).toContain(
      'Post a short summary of the prep note to the "standup" Slack channel using channel ID C1 via @Slack, with the link to the full prep note.'
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

    expect(both).toContain(
      "external meetings and consequential internal meetings"
    )
    // External is the catalog default, so the bare render pins it.
    expect(external).toContain(
      "Keep meetings with someone outside my organization"
    )
    expect(internal).toContain("Keep consequential internal meetings")
    for (const instructions of [both, external, internal]) {
      expect(instructions).toContain("focus blocks")
    }
    expect(both).toContain("routine syncs")
    expect(internal).toContain("routine syncs")
  })
})

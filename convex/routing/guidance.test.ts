import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type MessageRoutingContext } from "./context"
import { createRoutingGuidance } from "./guidance"

test("adds capability guidance before communication guidance", () => {
  const guidance = createRoutingGuidance(
    context({
      capabilitySummary: [
        "Connected:",
        "- Slack | yes: channels | ask: send replies",
        "",
        "Connectable: GitHub",
      ].join("\n"),
    })
  )
  const text = guidance ?? ""

  expect(text).toContain("## Capabilities")
  expect(text).toContain(
    "`yes` = usable now; `ask` = approval required; `no` = blocked"
  )
  expect(text).toContain("- Slack | yes: channels | ask: send replies")
  expect(text).toContain("Connectable: GitHub")
  expect(text.indexOf("## Capabilities")).toBeLessThan(
    text.indexOf("## Communication")
  )
})

function context(
  overrides: Partial<MessageRoutingContext> = {}
): MessageRoutingContext {
  const currentMessage = {
    actor: "<@U123>",
    createdAt: 1,
    id: "message" as Id<"messages">,
    observedAt: 1,
    source: "user" as const,
    text: "@Milo what can you do?",
    type: "message.channels",
  }

  return {
    activeRun: null,
    capabilitySummary: capabilitySummary(),
    currentMessage,
    integration: "slack",
    isAddressed: true,
    isDirect: false,
    isMentioned: true,
    recentMessages: [currentMessage],
    ...overrides,
  }
}

function capabilitySummary() {
  return [
    "Connected:",
    "- Milo | yes: capabilities",
    "",
    "Connectable: Slack",
  ].join("\n")
}

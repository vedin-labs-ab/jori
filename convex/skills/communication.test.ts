import { expect, test } from "vitest"
import { createCommunicationGuidance } from "./communication"
import { type RuntimeSkill } from "./runtime"

const consoleSkill: RuntimeSkill = {
  surfaces: ["console"],
  body: "# Console",
  category: "communication",
  communication: {
    parts: {
      files: "Attach files.",
      interactive: "Offer choices.",
      rich: "Use headings.",
      text: "Write plainly.",
    },
  },
  description: "Format console replies.",
  name: "console",
  organizationId: null,
}

test("the console surface gets text, rich, and interactive guidance", () => {
  const guidance = createCommunicationGuidance({
    surface: "console",
    profile: "agent-final-reply",
    skills: [consoleSkill],
  })

  expect(guidance.skill).toBe(consoleSkill)
  expect(guidance.format).toContain("Write plainly.")
  expect(guidance.format).toContain("Use headings.")
  expect(guidance.format).toContain("Offer choices.")
  expect(guidance.format).not.toContain("Attach files.")
})

test("a skill declared for another surface does not apply", () => {
  const guidance = createCommunicationGuidance({
    surface: "slack",
    profile: "agent-final-reply",
    skills: [consoleSkill],
  })

  expect(guidance.skill).toBeNull()
  expect(guidance.format).toBe("")
})

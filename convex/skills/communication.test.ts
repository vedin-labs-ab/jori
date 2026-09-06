import { expect, test } from "vitest"
import { skills } from "../../skills/generated"
import { createCommunicationGuidance } from "./communication"
import { normalizeSkillInput } from "./data"
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
    skills: [consoleSkill],
  })

  expect(guidance.skill).toBe(consoleSkill)
  expect(guidance.format).toContain("Write plainly.")
  expect(guidance.format).toContain("Use headings.")
  expect(guidance.format).toContain("Offer choices.")
  expect(guidance.format).not.toContain("Attach files.")
})

test("the shipped console skill teaches text, references, and choices", () => {
  const guidance = createCommunicationGuidance({
    surface: "console",
    skills: [{ ...normalizeSkillInput(skills.console), organizationId: null }],
  })

  expect(guidance.format).toContain("# Format")
  expect(guidance.format).toContain("Write the text first.")
  expect(guidance.format).toContain("Add a `reference` part")
  expect(guidance.format).toContain("A `choices` part without a `prompt`")
  expect(guidance.format.indexOf("Write the text first.")).toBeLessThan(
    guidance.format.indexOf("Add a `reference` part")
  )
  expect(guidance.format.indexOf("Add a `reference` part")).toBeLessThan(
    guidance.format.indexOf("A `choices` part without a `prompt`")
  )
})

test("a skill declared for another surface does not apply", () => {
  const guidance = createCommunicationGuidance({
    surface: "slack",
    skills: [consoleSkill],
  })

  expect(guidance.skill).toBeNull()
  expect(guidance.format).toBe("")
})

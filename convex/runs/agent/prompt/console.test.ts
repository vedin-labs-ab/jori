import { expect, test } from "vitest"
import { skills as shippedSkills } from "../../../../skills/generated"
import { consoleRuntimeInput } from "../../../../test/convex/prompt"
import { runtimeSkills } from "../../../../test/convex/skills"
import { normalizeSkillInput } from "../../../skills/data"
import { assemblePrompt } from "."

test("a console run reads the console skill's format after the communication rules", () => {
  const prompt = assemblePrompt(consoleRuntimeInput(), {
    skills: runtimeSkills([
      { ...normalizeSkillInput(shippedSkills.console), organizationId: null },
    ]),
  })
  const instructions = prompt.instructions

  expect(prompt.context).toContain("Active surface: `Console`")
  expect(instructions).toContain("# Communication")
  expect(instructions).toContain("Use `send_reply`")
  expect(instructions).toContain("# Format")
  expect(instructions).toContain("The console renders Markdown:")
  expect(instructions).toContain("Add a `reference` part")
  expect(instructions).toContain("A `choices` part without a `prompt`")
  expect(instructions.indexOf("# Communication")).toBeLessThan(
    instructions.indexOf("# Format")
  )
  expect(instructions.indexOf("# Format")).toBeLessThan(
    instructions.indexOf("# Finish")
  )
  expect(instructions).not.toMatch(/\n{3,}/)
})

test("the console skill is the surface's own, not a skill to load", () => {
  const instructions = assemblePrompt(consoleRuntimeInput(), {
    skills: runtimeSkills([
      { ...normalizeSkillInput(shippedSkills.console), organizationId: null },
    ]),
  }).instructions

  expect(instructions).not.toContain("- `console`:")
  expect(instructions).toContain("- `slack`:")
  expect(instructions).not.toContain("mrkdwn`, never GitHub Markdown")
})

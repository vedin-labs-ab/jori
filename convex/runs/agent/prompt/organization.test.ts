import { expect, test } from "vitest"
import { assemblePrompt } from "."
import { promptedTool, runtimeInput } from "./fixtures"

test("renders organization facts before the run section", () => {
  const prompt = assemblePrompt(
    {
      ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      organization: {
        name: "Milo Labs",
        summary: "Builds agent workspaces for engineering teams.",
        aliases: ["Milo", "Milo AI"],
        domains: ["https://milo.example", "https://milo.dev"],
      },
    },
    { promptedTools: [promptedTool()] }
  )

  expect(prompt).toContain("# Organization")
  expect(prompt).toContain("Name: Milo Labs")
  expect(prompt).toContain(
    "Summary: Builds agent workspaces for engineering teams."
  )
  expect(prompt).toContain("Also known as: Milo, Milo AI")
  expect(prompt).toContain("Websites:")
  expect(prompt).toContain("- https://milo.example")
  expect(prompt).toContain("- https://milo.dev")
  expect(prompt).not.toContain("Website:")
  expect(prompt).not.toContain("Products:")
  expect(prompt.indexOf("# Organization")).toBeLessThan(
    prompt.indexOf("# Voice")
  )
  expect(prompt.indexOf("# Organization")).toBeLessThan(prompt.indexOf("# Run"))
  expectNoSyntheticBlankLines(prompt)
})

test("omits the website section without websites", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: {
      name: "Milo Labs",
      aliases: [],
      domains: [],
    },
  })

  expect(prompt).toContain("# Organization")
  expect(prompt).toContain("Name: Milo Labs")
  expect(prompt).not.toContain("Websites:")
  expectNoSyntheticBlankLines(prompt)
})

test("omits the organization section without facts", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
  })

  expect(prompt).not.toContain("# Organization")
  expect(prompt.indexOf("# Finish")).toBeLessThan(prompt.indexOf("# Run"))
  expectNoSyntheticBlankLines(prompt)
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}

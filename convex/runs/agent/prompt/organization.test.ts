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
        products: [
          {
            name: "Milo",
            description: "An agent workspace for product engineering.",
          },
          {
            name: "Relay",
            description: "A coordination layer for background work.",
          },
        ],
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
  expect(prompt).toContain("Products:")
  expect(prompt).toContain(
    "- Milo: An agent workspace for product engineering."
  )
  expect(prompt).toContain("- Relay: A coordination layer for background work.")
  expect(prompt.indexOf("# Approvals")).toBeLessThan(
    prompt.indexOf("# Organization")
  )
  expect(prompt.indexOf("# Organization")).toBeLessThan(prompt.indexOf("# Run"))
  expectNoSyntheticBlankLines(prompt)
})

test("omits empty website and product sections", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: {
      name: "Milo Labs",
      aliases: [],
      domains: [],
      products: [],
    },
  })

  expect(prompt).toContain("# Organization")
  expect(prompt).toContain("Name: Milo Labs")
  expect(prompt).not.toContain("Websites:")
  expect(prompt).not.toContain("Products:")
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

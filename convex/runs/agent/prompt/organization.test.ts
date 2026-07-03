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
  const context = prompt.context

  expect(context).toContain("# Organization")
  expect(context).toContain("Name: Milo Labs")
  expect(context).toContain(
    "Summary: Builds agent workspaces for engineering teams."
  )
  expect(context).toContain("Also known as: Milo, Milo AI")
  expect(context).toContain("Websites:")
  expect(context).toContain("- https://milo.example")
  expect(context).toContain("- https://milo.dev")
  expect(context).not.toContain("Website:")
  expect(context).not.toContain("Products:")
  expect(context.indexOf("# Organization")).toBeLessThan(
    context.indexOf("# Run")
  )
  expect(prompt.instructions).not.toContain("# Organization")
  expectNoSyntheticBlankLines(context)
})

test("renders deduced workstreams inside the organization section", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: {
      name: "Milo Labs",
      aliases: [],
      domains: [],
    },
    workstreams: [
      { name: "Payments revamp", brief: "Rebuilding the payments flow." },
      { name: "SOC 2 push", brief: "Compliance work toward the audit." },
    ],
  } as unknown as Parameters<typeof assemblePrompt>[0]).context

  expect(prompt).toContain(
    "Active workstreams, deduced from recent activity across connected tools:"
  )
  expect(prompt).toContain("- Payments revamp: Rebuilding the payments flow.")
  expect(prompt).toContain("- SOC 2 push: Compliance work toward the audit.")
  expectNoSyntheticBlankLines(prompt)
})

test("omits the workstreams block without a roster", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: { name: "Milo Labs", aliases: [], domains: [] },
    workstreams: [],
  } as unknown as Parameters<typeof assemblePrompt>[0]).context

  expect(prompt).toContain("# Organization")
  expect(prompt).not.toContain("Active workstreams")
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
  }).context

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
  const context = prompt.context

  expect(context).not.toContain("# Organization")
  expect(context).toMatch(/^# Run\n\nRun ID: run\nRun started at:/)
  expect(prompt.instructions).not.toContain("# Organization")
  expectNoSyntheticBlankLines(context)
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}

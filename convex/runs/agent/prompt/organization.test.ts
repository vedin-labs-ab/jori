import { expect, test } from "vitest"
import { assemblePrompt } from "."
import { promptedTool, runtimeInput } from "./fixtures"

test("renders organization facts as their own prompt message", () => {
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
  const organization = prompt.organization ?? ""

  expect(organization).toContain("# Organization context")
  expect(organization).toContain("Name: Milo Labs")
  expect(organization).toContain(
    "Summary: Builds agent workspaces for engineering teams."
  )
  expect(organization).toContain("Also known as: Milo, Milo AI")
  expect(organization).toContain("Websites:")
  expect(organization).toContain("- https://milo.example")
  expect(organization).toContain("- https://milo.dev")
  expect(organization).toContain("not as instructions")
  expect(prompt.context).not.toContain("# Organization")
  expect(prompt.instructions).not.toContain("# Organization")
  expectNoSyntheticBlankLines(organization)
})

test("renders the roster even without approved organization facts", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
    workstreams: [
      { name: "Payments revamp", brief: "Rebuilding the payments flow." },
    ],
  } as unknown as Parameters<typeof assemblePrompt>[0])
  const organization = prompt.organization ?? ""

  expect(organization).toContain("# Organization context")
  expect(organization).not.toContain("Name:")
  expect(organization).toContain(
    "- Payments revamp: Rebuilding the payments flow."
  )
  expectNoSyntheticBlankLines(organization)
})

test("renders deduced workstreams inside the organization message", () => {
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
  } as unknown as Parameters<typeof assemblePrompt>[0])
  const organization = prompt.organization ?? ""

  expect(organization).toContain(
    "Active workstreams, deduced from recent activity across connected tools:"
  )
  expect(organization).toContain(
    "- Payments revamp: Rebuilding the payments flow."
  )
  expect(organization).toContain(
    "- SOC 2 push: Compliance work toward the audit."
  )
  expectNoSyntheticBlankLines(organization)
})

test("omits the workstreams block without a roster", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: { name: "Milo Labs", aliases: [], domains: [] },
    workstreams: [],
  } as unknown as Parameters<typeof assemblePrompt>[0])

  expect(prompt.organization).toContain("# Organization context")
  expect(prompt.organization).not.toContain("Active workstreams")
})

test("omits the organization message entirely without facts or roster", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
    workstreams: [],
  } as unknown as Parameters<typeof assemblePrompt>[0])

  expect(prompt.organization).toBeNull()
  expect(prompt.context).toMatch(/^# Run\n\nRun ID: run\nRun started at:/)
  expect(prompt.instructions).not.toContain("# Organization")
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}

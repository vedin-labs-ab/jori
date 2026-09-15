import { expect, test } from "vitest"
import { promptedTool, runtimeInput } from "../../../../test/convex/prompt"
import { assemblePrompt } from "."

test("renders organization facts as their own prompt message", () => {
  const prompt = assemblePrompt(
    {
      ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      organization: {
        name: "Jori Labs",
        summary: "Builds agent workspaces for engineering teams.",
        aliases: ["Jori", "Jori AI"],
        domains: ["https://jori.example", "https://jori.dev"],
      },
    },
    { promptedTools: [promptedTool()] }
  )
  const organization = prompt.organization ?? ""

  expect(organization).toContain("# Organization context")
  expect(organization).toContain("Name: Jori Labs")
  expect(organization).toContain(
    "Summary: Builds agent workspaces for engineering teams."
  )
  expect(organization).toContain("Also known as: Jori, Jori AI")
  expect(organization).toContain("Websites:")
  expect(organization).toContain("- https://jori.example")
  expect(organization).toContain("- https://jori.dev")
  expect(organization).toContain("not as instructions")
  expect(prompt.context).not.toContain("# Organization")
  expect(prompt.instructions).not.toContain("# Organization")
  expectNoSyntheticBlankLines(organization)
})

test("renders the name alone when the other facts are empty", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: { name: "Jori Labs", aliases: [], domains: [] },
  })
  const organization = prompt.organization ?? ""

  expect(organization).toContain("# Organization context")
  expect(organization).toContain("Name: Jori Labs")
  expect(organization).not.toContain("Summary:")
  expect(organization).not.toContain("Also known as:")
  expect(organization).not.toContain("Websites:")
  expectNoSyntheticBlankLines(organization)
})

test("omits the organization message entirely without approved facts", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
  })

  expect(prompt.organization).toBeNull()
  expect(prompt.context).toMatch(/^# Run\n\nRun ID: run\nRun started at:/)
  expect(prompt.instructions).not.toContain("# Organization")
})

test("passes the pre-rendered requester person context through", () => {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })
  const person = "# Person context\n\nName: Albin"

  expect(assemblePrompt(input, { person }).person).toBe(person)
  expect(assemblePrompt(input).person).toBeNull()
})

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}

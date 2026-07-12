import { expect, test } from "vitest"
import { promptedTool, runtimeInput } from "../../../../test/convex/prompt"
import { type WorkstreamContext } from "../../../deduction/roster"
import { assemblePrompt } from "."

const dayMs = 24 * 60 * 60 * 1000

// Fixture sightings use whole-day offsets from now; the rendered age is
// stable because the test finishes long before the next day boundary.
function workstream(
  name: string,
  brief: string,
  seenDaysAgo: number
): WorkstreamContext {
  return {
    name,
    brief,
    createdAt: Date.UTC(2026, 3, 10),
    seenAt: Date.now() - seenDaysAgo * dayMs,
  }
}

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
      workstream("Payments revamp", "Rebuilding the payments flow.", 2),
    ],
  })
  const organization = prompt.organization ?? ""

  expect(organization).toContain("# Organization context")
  expect(organization).not.toContain("Name:")
  expect(organization).toContain(
    "- Payments revamp (tracked since April 2026, last active 2 days ago): Rebuilding the payments flow."
  )
  expectNoSyntheticBlankLines(organization)
})

test("renders deduced workstreams with their timelines", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: {
      name: "Milo Labs",
      aliases: [],
      domains: [],
    },
    workstreams: [
      workstream("Payments revamp", "Rebuilding the payments flow.", 2),
      workstream("SOC 2 push", "Compliance work toward the audit.", 5),
    ],
  })
  const organization = prompt.organization ?? ""

  expect(organization).toContain(
    "Active workstreams, deduced from recent activity across connected tools:"
  )
  expect(organization).toContain(
    "- Payments revamp (tracked since April 2026, last active 2 days ago): Rebuilding the payments flow."
  )
  expect(organization).toContain(
    "- SOC 2 push (tracked since April 2026, last active 5 days ago): Compliance work toward the audit."
  )
  expect(organization).not.toContain("Quiet workstreams")
  expectNoSyntheticBlankLines(organization)
})

test("shrinks quiet workstreams to a single line without the brief", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: { name: "Milo Labs", aliases: [], domains: [] },
    workstreams: [
      workstream("Payments revamp", "Rebuilding the payments flow.", 2),
      workstream("SOC 2 push", "Compliance work toward the audit.", 60),
    ],
  })
  const organization = prompt.organization ?? ""

  expect(organization).toContain(
    "Quiet workstreams, still open but without recent activity:"
  )
  expect(organization).toContain(
    "- SOC 2 push (tracked since April 2026, last active 2 months ago)"
  )
  expect(organization).not.toContain("Compliance work toward the audit.")
  expectNoSyntheticBlankLines(organization)
})

test("omits the active block when every workstream is quiet", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
    workstreams: [
      workstream("SOC 2 push", "Compliance work toward the audit.", 60),
    ],
  })
  const organization = prompt.organization ?? ""

  expect(organization).not.toContain("Active workstreams")
  expect(organization).toContain(
    "Quiet workstreams, still open but without recent activity:"
  )
  expectNoSyntheticBlankLines(organization)
})

test("omits the workstreams block without a roster", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: { name: "Milo Labs", aliases: [], domains: [] },
    workstreams: [],
  })

  expect(prompt.organization).toContain("# Organization context")
  expect(prompt.organization).not.toContain("Active workstreams")
  expect(prompt.organization).not.toContain("Quiet workstreams")
})

test("omits the organization message entirely without facts or roster", () => {
  const prompt = assemblePrompt({
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    organization: null,
    workstreams: [],
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

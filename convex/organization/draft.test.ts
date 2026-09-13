import { type FunctionReference, getFunctionName } from "convex/server"
import { beforeEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../_generated/server"
import { crawlPage } from "./crawl"
import { run } from "./draft"
import { extractFacts } from "./extract"
import { selectLinks } from "./select"

vi.mock("./crawl", async (original) => ({
  ...(await original<typeof import("./crawl")>()),
  crawlPage: vi.fn(),
}))
vi.mock("./extract", () => ({ extractFacts: vi.fn() }))
vi.mock("./select", () => ({ selectLinks: vi.fn() }))

const primaryUrl = "https://acme.com"
const facts = { name: "Acme", aliases: [], domains: ["acme.com"] }
const home = { url: primaryUrl, text: "Acme", hash: "home", links: [] }
const args = { organizationId: "organization", primaryUrl }
const runDraft = (
  run as unknown as {
    _handler: (ctx: ActionCtx, input: typeof args) => Promise<void>
  }
)._handler

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(crawlPage).mockResolvedValue(home)
  vi.mocked(selectLinks).mockResolvedValue([])
  vi.mocked(extractFacts).mockResolvedValue(facts)
})

test("proposes extracted facts before baselining sources and completing discovery", async () => {
  const { ctx, calls } = context()
  const about = { ...home, url: `${primaryUrl}/about`, hash: "about" }
  vi.mocked(selectLinks).mockResolvedValue([about.url])
  vi.mocked(crawlPage).mockResolvedValueOnce(home).mockResolvedValueOnce(about)

  await runDraft(ctx, args)

  const sources = [
    { url: home.url, hash: "home", primary: true },
    { url: about.url, hash: "about", primary: false },
  ]
  expect(extractFacts).toHaveBeenCalledWith({
    primaryUrl,
    pages: [home, about].map(({ url, text }) => ({ url, text })),
  })
  expect(calls.slice(-4)).toEqual([
    [
      "profile:propose",
      {
        organizationId: args.organizationId,
        facts,
        sources,
        website: primaryUrl,
      },
    ],
    ["sources:baseline", { organizationId: args.organizationId, sources }],
    [
      "discovery:completeStep",
      { organizationId: args.organizationId, id: summaryId(calls) },
    ],
    ["discovery:finish", { organizationId: args.organizationId }],
  ])
})

test.each(["extraction", "profile:propose", "sources:baseline"])(
  "%s failure closes the summary and reports the discovery failure without later writes",
  async (stage) => {
    const error = new Error(`${stage} failed`)
    const { ctx, calls } = context(stage, error)
    if (stage === "extraction") {
      vi.mocked(extractFacts).mockRejectedValue(error)
    }

    await runDraft(ctx, args)

    expect(calls.slice(-2)).toEqual([
      [
        "discovery:completeStep",
        {
          organizationId: args.organizationId,
          id: summaryId(calls),
          error: error.message,
        },
      ],
      [
        "discovery:finish",
        { organizationId: args.organizationId, error: error.message },
      ],
    ])
    expect(calls.filter(([name]) => name === "sources:baseline")).toHaveLength(
      stage === "sources:baseline" ? 1 : 0
    )
    expect(calls.filter(([name]) => name === "profile:propose")).toHaveLength(
      stage === "extraction" ? 0 : 1
    )
  }
)

test("failure to start a summary reports discovery failure without completing a missing step", async () => {
  const error = new Error("start failed")
  const { ctx, calls } = context("summary", error)

  await runDraft(ctx, args)

  expect(extractFacts).not.toHaveBeenCalled()
  expect(calls.slice(-2)).toEqual([
    [
      "discovery:startStep",
      {
        organizationId: args.organizationId,
        id: summaryId(calls),
        kind: "summary",
        label: "Drafting profile",
      },
    ],
    [
      "discovery:finish",
      { organizationId: args.organizationId, error: error.message },
    ],
  ])
})

type MutationCall = [string, Record<string, unknown>]

function summaryId(calls: MutationCall[]) {
  return calls.find(([, input]) => input.kind === "summary")?.[1].id
}

function context(failingStage?: string, error?: Error) {
  const calls: MutationCall[] = []
  const runMutation = async (
    reference: FunctionReference<"mutation">,
    input: Record<string, unknown>
  ) => {
    const name = getFunctionName(reference).replace("organization/", "")
    calls.push([name, input])
    if (
      name === failingStage ||
      (failingStage === "summary" && input.kind === "summary")
    ) {
      throw error
    }
  }
  return { ctx: { runMutation } as unknown as ActionCtx, calls }
}

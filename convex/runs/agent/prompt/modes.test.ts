import { describe, expect, test } from "vitest"
import { jobRuntimeInput } from "../../../../test/convex/prompt"
import { assemblePrompt } from "."

describe("trigger modes", () => {
  test("names a manually started job run", () => {
    const input = jobRuntimeInput()

    if (input.type !== "job") {
      throw new Error("Expected job input.")
    }

    input.run.cause = { type: "manual" } as typeof input.run.cause

    expect(assemblePrompt(input).context).toContain(
      'The requester started this job run manually ("run now").'
    )
  })

  test("tells a delegated run to return its outcome", () => {
    const base = jobRuntimeInput()
    const input = {
      type: "instruction" as const,
      run: { ...base.run, parentId: "parent" },
      integrations: base.integrations,
      instructions: "Research the meeting.",
      organization: null,
      requester: null,
      timezone: null,
    }
    const context = assemblePrompt(
      input as unknown as Parameters<typeof assemblePrompt>[0]
    ).context

    expect(context).toContain("A parent run delegated this task to this run.")
    expect(context).toContain("return your outcome in its `result`")
    expect(context).not.toContain("Manual instructions triggered this run.")
  })
})

describe("job operating contract", () => {
  test("renders for job runs and stays out elsewhere", () => {
    const job = assemblePrompt(jobRuntimeInput()).instructions

    expect(job).toContain("# Job")
    expect(job).toContain(
      "A manually started run produces its outcome now and creates no scheduled deliveries."
    )
    expect(job).toContain("Deliver each outcome at most once.")
    expect(job).toContain("finishing quietly")
    expect(job).toContain("never present partial work as complete")

    const base = jobRuntimeInput()
    const instruction = assemblePrompt({
      type: "instruction",
      run: base.run,
      app: null,
      integrations: base.integrations,
      instructions: "Do the thing.",
      organization: null,
      requester: null,
      timezone: null,
    } as unknown as Parameters<typeof assemblePrompt>[0]).instructions

    expect(instruction).not.toContain("# Job")
  })
})

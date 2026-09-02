import { describe, expect, test } from "vitest"
import { automationRuntimeInput } from "../../../../test/convex/prompt"
import { assemblePrompt } from "."

describe("trigger modes", () => {
  test("names a manually started automation run", () => {
    const input = automationRuntimeInput()

    if (input.type !== "automation") {
      throw new Error("Expected automation input.")
    }

    input.run.cause = { type: "manual" } as typeof input.run.cause

    expect(assemblePrompt(input).context).toContain(
      'The requester started this automation run manually ("run now").'
    )
  })

  test("tells a delegated run to return its outcome", () => {
    const base = automationRuntimeInput()
    const input = {
      type: "instruction" as const,
      run: { ...base.run, parentId: "parent" },
      integrations: base.integrations,
      instructions: "Research the meeting.",
      organization: null,
      requester: null,
      timezone: null,
      workstreams: null,
    }
    const context = assemblePrompt(
      input as unknown as Parameters<typeof assemblePrompt>[0]
    ).context

    expect(context).toContain("A parent run delegated this task to this run.")
    expect(context).toContain("return your outcome in its `result`")
    expect(context).not.toContain("Manual instructions triggered this run.")
  })
})

describe("automation operating contract", () => {
  test("renders for automation runs and stays out elsewhere", () => {
    const automation = assemblePrompt(automationRuntimeInput()).instructions

    expect(automation).toContain("# Automation")
    expect(automation).toContain(
      "A manually started run produces its outcome now and creates no scheduled deliveries."
    )
    expect(automation).toContain("Deliver each outcome at most once.")
    expect(automation).toContain("finishing quietly")
    expect(automation).toContain("never present partial work as complete")

    const base = automationRuntimeInput()
    const instruction = assemblePrompt({
      type: "instruction",
      run: base.run,
      app: null,
      integrations: base.integrations,
      instructions: "Do the thing.",
      organization: null,
      requester: null,
      timezone: null,
      workstreams: null,
    } as unknown as Parameters<typeof assemblePrompt>[0]).instructions

    expect(instruction).not.toContain("# Automation")
  })
})

describe("recovery context", () => {
  test("lists prior-attempt write actions on retries only", () => {
    const input = automationRuntimeInput()
    const recovered = assemblePrompt(input, {
      recovery: {
        attempt: 2,
        actions: [
          {
            name: "google_gmail_send_message",
            detail: '{"subject":"Morning Briefing"}',
          },
          { name: "add_job", detail: null },
        ],
      },
    }).context

    expect(recovered).toContain("# Recovery")
    expect(recovered).toContain("This is attempt 2 of this run")
    expect(recovered).toContain(
      '- google_gmail_send_message — {"subject":"Morning Briefing"}'
    )
    expect(recovered).toContain("- add_job\n")
    expect(recovered).toContain("Never repeat one")
    expect(assemblePrompt(input).context).not.toContain("# Recovery")
  })
})

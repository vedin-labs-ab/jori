import { expect, test } from "vitest"
import {
  eventJobDisplay,
  fakeQueryCtx,
  testRun,
} from "../../../../test/convex/console"
import { summarizeRun } from "../summaries"

test("preserves stored GitHub pull request details and links", async () => {
  const run = testRun(
    eventRun({
      title: "GitHub PR event",
      task: "Handle the pull request comment.",
      snapshot: githubDisplay(),
    })
  )
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.details).toEqual([
    {
      type: "repository",
      label: "vedin-labs/frontier",
      url: "https://github.com/vedin-labs/frontier",
    },
    {
      type: "pull_request",
      label: "#42: Add execution metadata",
      url: "https://github.com/vedin-labs/frontier/pull/42",
    },
    {
      type: "comment",
      label: "Can you check this pull request?",
      url: "https://github.com/vedin-labs/frontier/pull/42#comment-123",
    },
  ])
})

test("preserves stored Linear issue labels and links", async () => {
  const run = testRun(
    eventRun({
      title: "Linear event",
      task: "Handle the Linear issue comment.",
      snapshot: linearDisplay(),
    })
  )
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.details).toContainEqual({
    type: "issue",
    label: "VED-5: Test issue",
    url: "https://linear.app/acme/issue/VED-5/test-issue",
  })
})

function eventRun(input: {
  snapshot: ReturnType<typeof eventJobDisplay>
  task: string
  title: string
}) {
  return {
    cause: { type: "event", eventId: "event" },
    instructions: input.task,
    snapshot: {
      title: input.title,
      ...input.snapshot,
    },
  }
}

function githubDisplay() {
  return eventJobDisplay({
    surface: "github",
    context: [
      {
        type: "repository",
        label: "vedin-labs/frontier",
        url: "https://github.com/vedin-labs/frontier",
      },
      {
        type: "pull_request",
        label: "#42: Add execution metadata",
        url: "https://github.com/vedin-labs/frontier/pull/42",
      },
      {
        type: "comment",
        label: "Can you check this pull request?",
        url: "https://github.com/vedin-labs/frontier/pull/42#comment-123",
      },
    ],
  })
}

function linearDisplay() {
  return eventJobDisplay({
    surface: "linear",
    context: [
      {
        type: "issue",
        label: "VED-5: Test issue",
        url: "https://linear.app/acme/issue/VED-5/test-issue",
      },
      {
        type: "comment",
        label: "Please take a look.",
      },
    ],
  })
}

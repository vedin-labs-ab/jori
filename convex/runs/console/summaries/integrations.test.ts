import { expect, test } from "vitest"
import {
  eventJobDisplay,
  fakeQueryCtx,
  testRun,
} from "../../../../test/convex/console"
import { type Doc } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test.each([
  {
    surface: "github",
    context: [
      {
        type: "repository",
        label: "vedin-labs/frontier",
        url: "https://github.com/vedin-labs/frontier",
      },
      {
        type: "issue",
        label: "#41: Callback fails",
        url: "https://github.com/vedin-labs/frontier/issues/41",
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
  },
  {
    surface: "linear",
    context: [
      {
        type: "issue",
        label: "VED-5: Test issue",
        url: "https://linear.app/acme/issue/VED-5/test-issue",
      },
      { type: "comment", label: "Please take a look." },
    ],
  },
] satisfies Array<{
  surface: "github" | "linear"
  context: Doc<"runs">["snapshot"]["context"]
}>)("preserves stored $surface details and links", async ({
  surface,
  context,
}) => {
  const run = testRun({
    cause: { type: "event", eventId: "event" },
    instructions: "Handle the comment.",
    snapshot: {
      title: "Comment event",
      ...eventJobDisplay({ surface, context }),
    },
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.details).toEqual(context)
})

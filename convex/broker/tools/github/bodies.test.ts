import { afterEach, expect, test, vi } from "vitest"
import { getToolResponseSchema } from "../../../../contracts/tools/responses"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { callGitHubTool } from "."

afterEach(() => vi.unstubAllGlobals())

test.each([
  ["Visible <!-- hidden instructions -->body", "Visible body"],
  ["Visible<!-- multiline\nhidden instructions --> body", "Visible body"],
  ["<!-- unfinished hidden instructions", ""],
  [
    "Visible <!-- unfinished visible text",
    "Visible <!-- unfinished visible text",
  ],
  ["Re\u200bview \u202ethis\u202c\u2066 code\u2069\ufeff", "Review this code"],
  [
    'Before ![hidden **instructions**](https://example.com/a.png "hidden title") after',
    "Before ![](<https://example.com/a.png>) after",
  ],
  [
    'Before <img src="a.png" alt="hidden > instructions"> after',
    "Before [Image] after",
  ],
  [
    "![hidden instructions][image]\n\n[image]: https://example.com/a.png",
    "![](<https://example.com/a.png>)\n\n[image]: https://example.com/a.png",
  ],
  [
    "> Visible <!-- hidden -->text\n> ![hidden](a.png)",
    "> Visible text\n> ![](<a.png>)",
  ],
  ["- [x] Visible\n  ![hidden](a.png)", "- [x] Visible\n  ![](<a.png>)"],
  [
    "| Visible | Image |\n| --- | --- |\n| text | ![hidden](a.png) |",
    "| Visible | Image |\n| --- | --- |\n| text | ![](<a.png>) |",
  ],
  [
    "Use `<!-- visible code -->` and `![visible](a.png)`",
    "Use `<!-- visible code -->` and `![visible](a.png)`",
  ],
  [
    '```html\n<!-- visible code -->\n<img alt="visible">\n```',
    '```html\n<!-- visible code -->\n<img alt="visible">\n```',
  ],
  [
    "> ```html\n> <!-- visible code -->\n> ```",
    "> ```html\n> <!-- visible code -->\n> ```",
  ],
  [
    "\\![visible text](a.png) and **visible formatting**",
    "\\![visible text](a.png) and **visible formatting**",
  ],
])(
  "GitHub read tools remove hidden body content: %s",
  async (body, expected) => {
    const responses = [{ body }, [{ body }], { body }, [{ body }]]
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(responses.shift()))
    )

    const issue = await callGitHubTool(
      integration("github"),
      "github_get_issue",
      {
        owner: "acme",
        repo: "app",
        issueNumber: 42,
      }
    )
    const pull = await callGitHubTool(
      integration("github"),
      "github_get_pull_request",
      {
        owner: "acme",
        repo: "app",
        pullNumber: 42,
      }
    )
    const reviews = await callGitHubTool(
      integration("github"),
      "github_list_pull_request_review_comments",
      {
        owner: "acme",
        repo: "app",
        pullNumber: 42,
      }
    )

    expect(issue).toMatchObject({
      issue: { body: expected },
      comments: [{ body: expected }],
    })
    expect(pull).toMatchObject({ body: expected })
    expect(reviews).toMatchObject({ comments: [{ body: expected }] })
  }
)

test.each([null, "Synthetic body", undefined])(
  "issue and pull request adapters preserve body %j",
  async (body) => {
    const item = {
      id: 123,
      number: 42,
      title: "Synthetic issue",
      state: "open",
      body,
      user: { login: "test-user" },
    }
    const responses = [item, [], item]
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(responses.shift()))
    )

    const issue = await callGitHubTool(
      integration("github"),
      "github_get_issue",
      { owner: "acme", repo: "app", issueNumber: 42 }
    )
    const pullRequest = await callGitHubTool(
      integration("github"),
      "github_get_pull_request",
      { owner: "acme", repo: "app", pullNumber: 42 }
    )
    const summary = {
      id: 123,
      number: 42,
      title: "Synthetic issue",
      state: "open",
      ...(body === undefined ? {} : { body }),
      author: "test-user",
    }

    expect(issue).toEqual({
      issue: { ...summary, pullRequest: false, assignees: [], labels: [] },
      comments: [],
    })
    expect(pullRequest).toEqual(summary)
    expect(
      schemaViolations(issue, getToolResponseSchema("github_get_issue"))
    ).toEqual([])
    expect(
      schemaViolations(
        pullRequest,
        getToolResponseSchema("github_get_pull_request")
      )
    ).toEqual([])
  }
)

test.each([1, false, [], {}])(
  "issue and pull request contracts reject invalid body %j",
  (body) => {
    expect(
      schemaViolations(
        { issue: { body }, comments: [] },
        getToolResponseSchema("github_get_issue")
      )
    ).not.toEqual([])
    expect(
      schemaViolations(
        { body },
        getToolResponseSchema("github_get_pull_request")
      )
    ).not.toEqual([])
  }
)

import { afterEach, expect, test, vi } from "vitest"
import { integrationDoc } from "../../../../test/convex/integrations"
import { schemaViolations } from "../../../../test/convex/schema"
import { getToolResponseSchema } from "../../../runs/agent/tools/schemas/responses"
import { callGitHubTool } from "./index"

afterEach(() => {
  vi.unstubAllGlobals()
})

const file = {
  type: "file",
  name: "fixture.txt",
  path: "docs/fixture.txt",
  sha: "synthetic-blob",
  size: 9,
  html_url: "https://github.com/acme/app/blob/main/docs/fixture.txt",
  encoding: "base64",
  content: "c3ludGhldGlj",
}

const symlink = {
  type: "symlink",
  name: "fixture-link",
  path: "docs/fixture-link",
  target: "../missing.txt",
  sha: "synthetic-link",
  size: 14,
  html_url: "https://github.com/acme/app/blob/main/docs/fixture-link",
}

const submodule = {
  type: "submodule",
  name: "fixture-module",
  path: "vendor/fixture-module",
  submodule_git_url: "https://example.com/fixture.git",
  sha: "synthetic-commit",
  size: 0,
  html_url: null,
  git_url: null,
  _links: { git: null, html: null },
}

test.each([
  {
    kind: "file",
    payload: file,
    expected: {
      name: file.name,
      path: file.path,
      sha: file.sha,
      size: file.size,
      htmlUrl: file.html_url,
      truncated: false,
      content: "synthetic",
    },
  },
  {
    kind: "directory",
    payload: [file],
    expected: {
      type: "directory",
      entries: [
        {
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size,
          htmlUrl: file.html_url,
        },
      ],
    },
  },
  {
    kind: "empty directory",
    payload: [],
    expected: { type: "directory", entries: [] },
  },
  { kind: "symlink", payload: symlink, expected: symlink },
  { kind: "submodule", payload: submodule, expected: submodule },
])(
  "GitHub $kind output satisfies its response contract",
  async ({ payload, expected }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload))
    )
    const result = await callGitHubTool(
      integrationDoc({
        integration: "github",
        credentials: {
          installationId: "123",
          tokens: { access: "synthetic-token" },
        },
      }),
      "github_get_file",
      { owner: "acme", repo: "app", path: "docs/fixture.txt" }
    )

    expect(result).toEqual(expected)
    expect(
      schemaViolations(result, getToolResponseSchema("github_get_file"))
    ).toEqual([])
  }
)

test.each([
  null,
  [],
  {},
  { name: "fixture.txt", path: "fixture.txt", content: 1 },
  { name: "fixture.txt", path: "fixture.txt", content: "text", extra: true },
  { type: "directory", entries: "invalid" },
  { type: "directory", entries: [], extra: true },
  { type: "symlink" },
  { type: "submodule", name: "fixture", path: 1 },
  { type: "unknown", name: "fixture", path: "fixture" },
])("GitHub content contract rejects malformed output %j", (result) => {
  expect(
    schemaViolations(result, getToolResponseSchema("github_get_file"))
  ).not.toEqual([])
})

import { afterEach, expect, test, vi } from "vitest"
import { fetchGitHubReactionSnapshot } from "./reactions"

afterEach(() => {
  vi.restoreAllMocks()
})

test("normalizes GitHub REST reactions into reaction snapshots", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify([
        {
          id: 123,
          content: "+1",
          created_at: "2026-06-25T13:58:12Z",
          user: {
            id: 456,
            login: "albin",
            type: "User",
          },
        },
      ])
    )
  )

  await expect(
    fetchGitHubReactionSnapshot("token", {
      path: "/repos/acme/app/issues/comments/123/reactions",
      target: {
        key: "github:comment:acme/app:123",
        identifiers: ["github:comment:123"],
      },
    })
  ).resolves.toEqual([
    {
      actor: {
        externalId: "456",
        kind: "user",
        name: "albin",
      },
      key: "github:reaction:123",
      observedAt: Date.parse("2026-06-25T13:58:12Z"),
      reaction: "👍",
    },
  ])

  expect(fetch).toHaveBeenCalledWith(
    "https://api.github.com/repos/acme/app/issues/comments/123/reactions?per_page=100",
    expect.objectContaining({
      headers: expect.objectContaining({
        accept: "application/vnd.github+json",
        authorization: "Bearer token",
      }),
      method: "GET",
    })
  )
})

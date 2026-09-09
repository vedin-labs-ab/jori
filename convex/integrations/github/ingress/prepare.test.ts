import { expect, test } from "vitest"
import { prepareGitHubEvent } from "./prepare"

test("normalizes large push deliveries before writing the regional inbox", () => {
  const payload = {
    installation: { id: 123 },
    repository: { full_name: "jori/test", default_branch: "main" },
    ref: "refs/heads/main",
    commits: Array.from({ length: 2048 }, (_, index) => ({
      message: `Commit ${index}\n${"details".repeat(200)}`,
      added: [`src/file-${index}.ts`],
    })),
  }
  expect(JSON.stringify(payload).length).toBeGreaterThan(1_000_000)
  const prepared = prepareGitHubEvent({
    event: "push",
    deliveryId: "push",
    payload,
  })
  expect(prepared).toMatchObject({
    kind: "lifecycle",
    accountId: "123",
    lifecycle: { type: "commits.pushed" },
  })
  expect(JSON.stringify(prepared).length).toBeLessThan(10_000)
})

test("does not retain ignored provider payloads", () => {
  expect(
    prepareGitHubEvent({
      event: "ping",
      deliveryId: "ping",
      payload: { installation: { id: 123 } },
    })
  ).toBeNull()
})

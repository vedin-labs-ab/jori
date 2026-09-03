import { vi } from "vitest"

export function createFileContext() {
  return {
    run: {
      _id: "run-id",
      _creationTime: 0,
      organizationId: "organization",
      principal: { kind: "organization" },
      promptId: "prompt-id",
      status: "running",
      createdAt: 0,
    },
    ctx: {
      runMutation: vi.fn(async () => ({
        channelId: "C123",
        recordFinal: false,
        source: false,
        threadTs: "123.456",
      })),
      runQuery: vi.fn(async () => ({
        _id: "file-id",
        _creationTime: 0,
        organizationId: "organization",
        scope: "organization",
        runId: "run-id",
        storageId: "storage-id",
        name: "kitten.png",
        mimeType: "image/png",
        size: 5,
        createdAt: 0,
        updatedAt: 0,
      })),
      storage: {
        get: vi.fn(
          async () => new Blob([new Uint8Array([104, 101, 108, 108, 111])])
        ),
      },
    },
  } as never
}

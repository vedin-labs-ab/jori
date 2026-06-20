import { vi } from "vitest"

export function attachmentContext() {
  return {
    run: {
      _id: "run-id",
      _creationTime: 0,
      tenantId: "tenant",
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
        _id: "attachment-id",
        _creationTime: 0,
        tenantId: "tenant",
        runId: "run-id",
        storageId: "storage-id",
        name: "kitten.png",
        mimeType: "image/png",
        size: 5,
        description: "A small generated image.",
        createdAt: 0,
      })),
      storage: {
        get: vi.fn(
          async () => new Blob([new Uint8Array([104, 101, 108, 108, 111])])
        ),
      },
    },
  } as never
}

// @vitest-environment node
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

vi.mock("./pdf", () => ({
  extractPdf: async () => ({
    sections: [{ text: "Selectable text", page: 1 }],
    recognition: [1],
    partial: false,
  }),
}))
vi.mock("./media", () => ({
  extractMedia: async () => {
    throw new Error("OCR temporarily unavailable")
  },
}))
afterEach(() => vi.unstubAllEnvs())
test("a temporary OCR outage preserves selectable text and requests a retry", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("CONVEX_CLOUD_URL", "https://preview.eu-west-1.convex.cloud")
  const t = convexTest(schema, import.meta.glob("/convex/**/*.{ts,js}"))
  const storageId = await t.run((ctx) =>
    ctx.storage.store(new Blob(["synthetic"], { type: "application/pdf" }))
  )
  const result = await t.action(internal.discovery.extraction.index.extract, {
    organizationId: "org",
    sourceKey: "file:test",
    revision: "1",
    storageId,
    fileName: "test.pdf",
    mimeType: "application/pdf",
  })
  expect(result).toMatchObject({
    sections: [{ text: "Selectable text", page: 1 }],
    coverage: "partial",
    retryable: true,
  })
})

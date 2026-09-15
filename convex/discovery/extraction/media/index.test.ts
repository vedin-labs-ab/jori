import { afterEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../../_generated/server"
import { extractMedia } from "./index"

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  upload: vi.fn(),
  command: vi.fn(),
  kill: vi.fn(),
  remove: vi.fn(),
}))
vi.mock("../../../runtime/sandbox/blaxel/client", () => ({
  createSandbox: mocks.create,
  sandboxName: () => "synthetic-sandbox",
  writeSandboxFiles: mocks.upload,
  runSandboxCommand: mocks.command,
  readSandboxFile: async () =>
    new TextEncoder().encode(
      '{"partial":true}\n{"text":"invoice","seconds":2}\n{"complete":true}'
    ),
  killSandbox: mocks.kill,
}))
vi.mock("../cleanup", () => ({ remove: mocks.remove }))
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})
const source = {
  sourceKey: "files:fixture",
  revision: "current",
  organizationId: "workspace",
}

test("workspace deletion prevents the first content upload and deletes the empty sandbox", async () => {
  vi.stubEnv("JORI_DISCOVERY_BLAXEL_IMAGE", "synthetic-image")
  const ctx = { runMutation: async () => null } as unknown as ActionCtx
  await expect(
    extractMedia(ctx, source, new Uint8Array([1]), "audio")
  ).rejects.toThrow("being deleted")
  expect(mocks.upload).not.toHaveBeenCalled()
  expect(mocks.kill).toHaveBeenCalledWith("synthetic-sandbox")
})

test("extraction failure still attempts durable content sandbox cleanup", async () => {
  vi.stubEnv("JORI_DISCOVERY_BLAXEL_IMAGE", "synthetic-image")
  const registered = vi.fn(async () => "registered")
  const ctx = { runMutation: registered } as unknown as ActionCtx
  mocks.command.mockRejectedValueOnce(new Error("Parser stopped"))
  await expect(
    extractMedia(ctx, source, new Uint8Array([1]), "audio")
  ).rejects.toThrow("Parser stopped")
  expect(registered.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.upload.mock.invocationCallOrder[0]
  )
  expect(mocks.remove).toHaveBeenCalledWith(ctx, {
    _id: "registered",
    externalId: "synthetic-sandbox",
  })
})

test("an unconfigured extractor cannot fall back to the ordinary sandbox image", async () => {
  vi.stubEnv("JORI_DISCOVERY_BLAXEL_IMAGE", undefined)
  const ctx = {} as ActionCtx
  await expect(
    extractMedia(ctx, source, new Uint8Array([1]), "audio")
  ).rejects.toThrow("not configured")
  expect(mocks.create).not.toHaveBeenCalled()
})

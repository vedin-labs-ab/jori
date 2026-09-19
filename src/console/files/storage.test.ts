import { afterEach, expect, test, vi } from "vitest"
import { uploadToStorage } from "./storage"

afterEach(() => vi.unstubAllGlobals())

test("uploads send the signed create-only condition and propagate rejected overwrites", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 412 }))
  vi.stubGlobal("fetch", fetch)
  const body = new Blob(["first content"], { type: "text/plain" })
  await uploadToStorage("https://upload.test", body)
  expect(fetch).toHaveBeenCalledWith("https://upload.test", {
    method: "PUT",
    headers: { "Content-Type": "text/plain", "If-None-Match": "*" },
    body,
  })
  await expect(uploadToStorage("https://upload.test", body)).rejects.toThrow(
    "Upload failed"
  )
})

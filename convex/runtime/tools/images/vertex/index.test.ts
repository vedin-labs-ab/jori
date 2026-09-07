import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { generateVertexImage } from "./index"

vi.mock("./auth", () => ({
  vertexAccessToken: vi.fn(async () => "test-token"),
}))
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("VERTEX_PROJECT_ID", "jori-production-eu")
  vi.stubEnv(
    "VERTEX_CLIENT_EMAIL",
    "image-generation@jori-production-eu.iam.gserviceaccount.com"
  )
  vi.stubEnv("VERTEX_PRIVATE_KEY", "test-key")
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test.each([
  "eu",
  "us",
])("sends only to the fixed %s endpoint and normalizes inline bytes", async (region) => {
  vi.stubEnv("JORI_REGION", region)
  fetchMock.mockResolvedValue(Response.json(response()))
  const result = await generateVertexImage("A simple test image")
  expect(result.image).toEqual({
    bytes: new TextEncoder().encode("image"),
    mimeType: "image/png",
  })
  expect(result.usage).toMatchObject({
    provider: "vertex",
    requestId: "request-1",
    micros: 73930,
  })
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toContain(`https://aiplatform.${region}.rep.googleapis.com/`)
  expect(url).toContain(`/locations/${region}/`)
  expect(options.redirect).toBe("error")
  expect(JSON.parse(options.body)).toEqual({
    contents: [{ role: "user", parts: [{ text: "A simple test image" }] }],
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 8192,
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { imageSize: "1K" },
    },
  })
})

test("does not retry or expose the provider error body", async () => {
  fetchMock.mockResolvedValue(new Response("sensitive prompt", { status: 503 }))
  await expect(generateVertexImage("private prompt")).rejects.toThrow(
    "Vertex image generation failed (503)."
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test("returns billable usage for a response with no image", async () => {
  fetchMock.mockResolvedValue(Response.json({ ...response(), candidates: [] }))
  expect(await generateVertexImage("test")).toMatchObject({
    image: null,
    usage: { micros: 73930 },
  })
})

test("does not fetch remote image URLs", async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      ...response(),
      candidates: [
        {
          content: {
            parts: [
              { fileData: { fileUri: "https://external.example/image.png" } },
            ],
          },
        },
      ],
    })
  )
  expect((await generateVertexImage("test")).image).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

function response() {
  return {
    responseId: "request-1",
    candidates: [
      {
        content: {
          parts: [
            { inlineData: { mimeType: "image/png", data: btoa("image") } },
          ],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: 17,
      candidatesTokenCount: 1120,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
    },
  }
}

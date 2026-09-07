import { expect, test } from "vitest"
import { normalizeExaResponse } from "./response"

test("normalizes absent and malformed optional content at the provider edge", () => {
  const response = JSON.parse(
    JSON.stringify({
      results: [
        {
          url: "https://example.com",
          text: null,
          highlights: [null, "Relevant"],
          extras: { links: [false, "https://example.com/about"] },
        },
      ],
    })
  )

  expect(normalizeExaResponse(response).results[0]).toMatchObject({
    text: undefined,
    highlights: ["Relevant"],
    links: ["https://example.com/about"],
  })
})

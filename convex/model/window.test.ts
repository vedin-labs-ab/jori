import { expect, test } from "vitest"
import { modelContextFallback } from "../../contracts/billing"
import { databaseContext } from "../../test/convex/database"
import { modelWindow } from "./window"

test("falls back to the documented window until a refresh has written a row", async () => {
  const { ctx } = databaseContext()

  expect(await modelWindow(ctx, "openai/gpt-x")).toEqual({
    contextLength: modelContextFallback.contextLength,
    maxCompletionTokens: null,
  })
})

test("reads the fetched window and completion cap for the model", async () => {
  const { ctx, database } = databaseContext()

  await database.insert("models", {
    model: "openai/gpt-x",
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    fetchedAt: 1,
  })
  await database.insert("models", {
    model: "other/model",
    contextLength: 8_000,
    fetchedAt: 1,
  })

  expect(await modelWindow(ctx, "openai/gpt-x")).toEqual({
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
  })
  expect(await modelWindow(ctx, "other/model")).toEqual({
    contextLength: 8_000,
    maxCompletionTokens: null,
  })
})

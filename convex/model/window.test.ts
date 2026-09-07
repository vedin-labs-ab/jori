import { expect, test } from "vitest"
import { catalogModel } from "../../contracts/models/catalog"
import { defaultSelection } from "../../contracts/models/selection"
import { databaseContext } from "../../test/convex/database"
import { liveModelRate } from "./rate"
import { modelWindow } from "./window"

const rate = { inputMicrosPerToken: 3, outputMicrosPerToken: 9 }

test("falls back to the catalog's window and rate until a refresh has written a row", async () => {
  const { ctx } = databaseContext()
  const listed = catalogModel(defaultSelection.model)

  expect(await modelWindow(ctx, defaultSelection.model)).toEqual({
    contextLength: listed.contextLength,
    maxCompletionTokens: listed.maxCompletionTokens ?? null,
  })
  expect(await liveModelRate(ctx, defaultSelection.model)).toEqual(listed.rate)
  await expect(modelWindow(ctx, "openai/gpt-x")).rejects.toThrow(
    "openai/gpt-x is not a model Jori can run on."
  )
})

test("reads the fetched window, completion cap, and rate for the model", async () => {
  const { ctx, database } = databaseContext()

  await database.insert("models", {
    model: "openai/gpt-x",
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    rate,
    fetchedAt: 1,
  })
  await database.insert("models", {
    model: "other/model",
    contextLength: 8_000,
    rate,
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
  expect(await liveModelRate(ctx, "other/model")).toEqual(rate)
})

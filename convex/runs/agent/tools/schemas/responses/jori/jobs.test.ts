import { expect, test } from "vitest"
import { compileSchema } from "../../../../../../../test/convex/schema"
import { jobJoriToolResponseSchemas } from "./jobs"

const job = {
  _id: "synthetic-job",
  name: "JORI-E2E once job",
  instructions: "Post one synthetic comment.",
  type: "once",
  status: "active",
  visibility: { mode: "private" },
  principal: { kind: "person", personId: "synthetic-person" },
  createdAt: 1,
  updatedAt: 2,
  version: 2,
  trigger: { at: 3, functionId: "synthetic-schedule" },
  access: { integrations: [], web: false },
}

test.each([
  "once",
  "cron",
  "event",
])("job responses describe the current %s trigger kind", (type) => {
  const value = { ...job, type }
  for (const tool of ["add_job", "read_job", "update_job"] as const) {
    expect(compileSchema(jobJoriToolResponseSchemas[tool])(value)).toBe(true)
  }
  expect(compileSchema(jobJoriToolResponseSchemas.search_jobs)([value])).toBe(
    true
  )
})

test("job responses require current visibility and execution identity", () => {
  const validate = compileSchema(jobJoriToolResponseSchemas.read_job)
  expect(
    validate({
      ...job,
      visibility: { mode: "organization" },
      principal: { kind: "organization" },
    })
  ).toBe(true)
  expect(validate({ ...job, principal: { kind: "person" } })).toBe(false)
  const { visibility: _visibility, ...withoutVisibility } = job
  expect(validate({ ...withoutVisibility, audience: "personal" })).toBe(false)
  expect(validate({})).toBe(false)
  expect(validate(null)).toBe(true)
})

test.each([
  "recurring",
  "mention",
])("job responses reject obsolete %s trigger kinds", (type) => {
  expect(
    compileSchema(jobJoriToolResponseSchemas.read_job)({ ...job, type })
  ).toBe(false)
})

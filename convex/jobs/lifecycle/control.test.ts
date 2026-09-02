import { beforeEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { releaseSubscription } from "../subscriptions/data"
import { deleteOwnedJobs } from "./children"
import { pauseJob, removeJob } from "./control"
import { getOrganizationJob, getRequiredJob } from "./read"
import { cancelTrigger } from "./trigger"

vi.mock("../subscriptions/data", () => ({ releaseSubscription: vi.fn() }))
vi.mock("./children", () => ({ deleteOwnedJobs: vi.fn() }))
vi.mock("./read", () => ({
  getRequiredJob: vi.fn(),
  getOrganizationJob: vi.fn(),
}))
vi.mock("./trigger", () => ({
  cancelTrigger: vi.fn(),
  scheduleNextCronJob: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(deleteOwnedJobs).mockReset()
  vi.mocked(cancelTrigger).mockReset()
  vi.mocked(getRequiredJob).mockReset()
  vi.mocked(getOrganizationJob).mockReset()
  vi.mocked(releaseSubscription).mockReset()
})

test("pausing invalidates runs from the prior configuration", async () => {
  const job = parentJob()
  const patch = vi.fn(async () => undefined)
  const ctx = { db: { patch } } as unknown as MutationCtx
  vi.mocked(getOrganizationJob).mockResolvedValue(job)
  vi.mocked(getRequiredJob).mockResolvedValue({
    ...job,
    version: 8,
    status: "paused",
  })

  await pauseJob(ctx, {
    organizationId: job.organizationId,
    jobId: job._id,
  })

  expect(patch).toHaveBeenCalledWith(
    job._id,
    expect.objectContaining({ version: 8, status: "paused" })
  )
  expect(deleteOwnedJobs).toHaveBeenCalledWith(ctx, job._id)
})

test("removing stops the parent before deleting it and its children", async () => {
  const job = eventJob()
  const remove = vi.fn(async () => undefined)
  const ctx = { db: { delete: remove } } as unknown as MutationCtx
  vi.mocked(getOrganizationJob).mockResolvedValue(job)

  await removeJob(ctx, {
    organizationId: job.organizationId,
    jobId: job._id,
  })

  expect(cancelTrigger).toHaveBeenCalledWith(ctx, job.trigger)
  expect(releaseSubscription).toHaveBeenCalledWith(ctx, {
    organizationId: job.organizationId,
    trigger: job.trigger,
    exceptJobId: job._id,
  })
  expect(remove).toHaveBeenCalledWith(job._id)
  expect(deleteOwnedJobs).toHaveBeenCalledWith(ctx, job._id)
})

function parentJob(): Doc<"jobs"> {
  return {
    _id: "parent" as Id<"jobs">,
    _creationTime: 0,
    organizationId: "organization",
    version: 7,
    name: "Meeting Briefing",
    instructions: "Plan briefings.",
    visibility: { mode: "private" },
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    access: { integrations: [], web: false },
    type: "cron",
    trigger: {
      expression: "0 7 * * *",
      timezone: "UTC",
      nextAt: 1,
    },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  }
}

function eventJob(): Doc<"jobs"> {
  return {
    _id: "event" as Id<"jobs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Handle the event.",
    name: "Event job",
    principal: { kind: "organization" },
    visibility: { mode: "organization" },
    status: "active",
    organizationId: "organization",
    trigger: {
      integrationId: "integration" as Id<"integrations">,
      event: "message.created",
    },
    type: "event",
    updatedAt: 0,
  }
}

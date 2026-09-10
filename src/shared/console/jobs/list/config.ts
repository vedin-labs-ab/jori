import { type SelectionRemoval } from "../../list/bar"
import { type ListConfig } from "../../list/controls"
import { type FolderNames, folderFacet } from "../../materials/folders"
import { ownerFacet } from "../../materials/owners"
import { type Job } from "../types"
import { nextRunAt } from "./trigger"

export const jobNoun = { plural: "jobs", singular: "job" }

/** What the job list headers sort and filter: the shared material facets
 *  plus the name and the two run times. Jobs without a next run sort
 *  after every scheduled one. */
export function jobListConfig(
  folders: FolderNames | undefined,
  jobs: readonly Job[]
): ListConfig<Job> {
  return {
    facets: {
      folder: folderFacet(folders),
      owner: ownerFacet(jobs),
    },
    sorts: {
      fired: (job) => job.firedAt ?? 0,
      name: (job) => job.name,
      next: (job) => nextRunAt(job) ?? Number.POSITIVE_INFINITY,
    },
  }
}

/** How the selection bar names deleting jobs: outright, unlike the
 *  materials' archive step. */
export const jobBulkRemoval: SelectionRemoval = {
  description:
    "This permanently deletes the jobs and cancels their upcoming runs. Past runs are kept.",
  isDestructive: true,
  label: "Delete",
}

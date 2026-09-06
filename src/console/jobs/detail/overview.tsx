import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import { type JobDetailProps } from "@/shared/console/jobs/detail"
import { type Job } from "@/shared/console/jobs/types"
import { useNow } from "@/shared/console/time"
import { useFolderNames } from "../../shared/materials/names"
import { useSkillNames } from "../skills"
import { JobRuns } from "./runs"

// The brief's renderer carries the markdown codec, so it arrives with
// the first job overview rather than with every console chunk.
const JobInstructions = lazy(async () => ({
  default: (await import("@/shared/console/jobs/detail/instructions"))
    .JobInstructions,
}))

/** The job's overview as `JobDetail` takes it, bound to Convex: the
 *  folder names its filing reads from, the brief with its mentions
 *  resolved against the tool policy and the skill catalog, and the job's
 *  runs. The job's page and the chat's pane mount the same overview. */
export function useJobOverview(
  organizationId: string,
  job: Job,
  permissions: JobPolicyPermissions
): JobDetailProps {
  const skills = useSkillNames(organizationId)

  return {
    folders: useFolderNames(organizationId),
    instructions: (
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <JobInstructions job={job} permissions={permissions} skills={skills} />
      </Suspense>
    ),
    job,
    now: useNow(30_000),
    runs: <JobRuns jobId={job.id} organizationId={organizationId} />,
  }
}

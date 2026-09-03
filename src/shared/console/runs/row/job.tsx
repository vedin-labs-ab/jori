import { Workflow } from "lucide-react"
import { ConsoleLink } from "../../shell/link"
import { DetailLine, DetailRow } from "../details"

/** The job the run answers to, linking to its page. The row's header is
 *  a button, so the link lives here in the opened detail. */
export function JobFact({ job }: { job: { id: string; name: string } }) {
  return (
    <DetailRow icon={Workflow} label="Job">
      <DetailLine>
        <ConsoleLink
          className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline"
          params={{ jobId: job.id }}
          title={job.name}
          to="/jobs/$jobId"
        >
          {job.name}
        </ConsoleLink>
      </DetailLine>
    </DetailRow>
  )
}

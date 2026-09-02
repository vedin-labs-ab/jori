import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { VisibilityBadge } from "../../shared/visibility/badge"
import { type Job } from "../types"
import { JobRowMenu } from "./actions"
import { DeleteJobDialog } from "./delete"
import { JobStatusMark } from "./mark"
import { JobMeta } from "./meta"

export function JobRow({
  isControlling,
  isDeleting,
  now,
  onDelete,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  job,
}: {
  isControlling: boolean
  isDeleting: boolean
  now: number
  onDelete: (job: Job) => void
  onEdit: (job: Job) => void
  onMoveToFolder: (job: Job) => void
  onPausedChange: (job: Job, paused: boolean) => void
  job: Job
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const requestDelete = () => setIsDeleteOpen(true)

  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0 ring-inset transition-colors hover:bg-muted/20">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 sm:p-5">
          <JobStatusMark
            isControlling={isControlling}
            isDeleting={isDeleting}
            onDeleteRequest={requestDelete}
            onPausedChange={onPausedChange}
            job={job}
          />
          <div className="grid min-w-0 content-start gap-1.5">
            <div className="grid min-h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate font-heading text-sm font-medium">
                  {job.name}
                </h3>
                {job.visibility.mode === "organization" ? null : (
                  <VisibilityBadge visibility={job.visibility} />
                )}
                {shouldShowCompletedBadge(job) ? (
                  <Badge className="shrink-0" variant="outline">
                    Completed
                  </Badge>
                ) : job.status === "paused" ? (
                  <Badge className="shrink-0" variant="secondary">
                    Paused
                  </Badge>
                ) : null}
              </div>
              <JobRowMenu
                isControlling={isControlling}
                isDeleting={isDeleting}
                onDeleteRequest={requestDelete}
                onEdit={onEdit}
                onMoveToFolder={onMoveToFolder}
                onPausedChange={onPausedChange}
                job={job}
              />
            </div>
            <p className="line-clamp-3 max-w-[72ch] text-muted-foreground text-xs/relaxed">
              {job.instructions}
            </p>
          </div>
        </div>
        <CardContent className="mt-auto border-t bg-muted/20 p-0">
          <JobMeta now={now} job={job} />
        </CardContent>
      </Card>
      <DeleteJobDialog
        isDeleting={isDeleting}
        onDelete={() => onDelete(job)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
        job={job}
      />
    </li>
  )
}

function shouldShowCompletedBadge(job: Job) {
  return job.status === "completed" && job.type !== "once"
}

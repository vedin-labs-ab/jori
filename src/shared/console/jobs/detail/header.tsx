import { Loader2, Pause, Pencil, Play } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../layout"
import { type Job, jobControlAction } from "../types"

/** A job page's header keeps the two actions worth a button: pausing or
 *  resuming the job, and opening its editor. Everything else hangs off
 *  its name in the breadcrumb. */
export function JobHeaderActions({
  isControlling,
  job,
  onEdit,
  onPausedChange,
}: {
  isControlling: boolean
  job: Job
  onEdit: (job: Job) => void
  onPausedChange: (job: Job, paused: boolean) => void
}) {
  const control = jobControlAction(job)

  return (
    <ConsoleHeaderActions>
      {control === undefined ? null : (
        <ConsoleHeaderButton
          disabled={isControlling}
          icon={
            isControlling ? (
              <Loader2 className="animate-spin" />
            ) : control === "pause" ? (
              <Pause />
            ) : (
              <Play />
            )
          }
          label={control === "pause" ? "Pause" : "Resume"}
          onClick={() => onPausedChange(job, control === "pause")}
          type="button"
          variant="outline"
        />
      )}
      <ConsoleHeaderButton
        icon={<Pencil />}
        label="Edit"
        onClick={() => onEdit(job)}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

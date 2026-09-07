import { MentionRemoveButton } from "@/shared/console/mentions/chip"
import { ProviderLogo } from "@/shared/logo/provider"
import { type JobSurfaceIntegration } from "../../../access"

/** An integration pill's identity segment: its mark, swapping to the
 *  remove control on hover, next to its name. */
export function JobSurfaceRemoveButton({
  onRemove,
  integration,
  toolSurfaceLabel,
}: {
  onRemove: () => void
  integration: JobSurfaceIntegration
  toolSurfaceLabel: string
}) {
  return (
    <MentionRemoveButton
      data-job-remove-content=""
      icon={<ProviderLogo className="size-3" surface={integration} />}
      label={toolSurfaceLabel}
      onRemove={onRemove}
    />
  )
}

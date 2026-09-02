import { type ComponentProps } from "react"
import { VisibilityField } from "@/shared/console/visibility/field"
import { useGrantOptions } from "./options"

/** The sharing field offering the organization's own people and teams. */
export function OrganizationVisibilityField({
  organizationId,
  ...field
}: Omit<ComponentProps<typeof VisibilityField>, "options"> & {
  organizationId: string
}) {
  return (
    <VisibilityField {...field} options={useGrantOptions(organizationId)} />
  )
}

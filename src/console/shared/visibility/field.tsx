import { type ComponentProps } from "react"
import { VisibilityField } from "@/shared/console/visibility/field"
import { usePeopleOptions, useTeamOptions } from "./options"

/** The sharing field offering the organization's own people and teams. */
export function OrganizationVisibilityField({
  organizationId,
  ...field
}: Omit<ComponentProps<typeof VisibilityField>, "options"> & {
  organizationId: string
}) {
  const people = usePeopleOptions(organizationId)
  const teams = useTeamOptions(organizationId)

  return <VisibilityField {...field} options={{ people, teams }} />
}

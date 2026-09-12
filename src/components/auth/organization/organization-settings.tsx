import { useAuth } from "@better-auth-ui/react"
import type { ComponentProps, ReactNode } from "react"

import { SectionGroup } from "@/components/ui/section"
import { OrganizationDangerZone } from "./organization-danger-zone"
import { OrganizationProfile } from "./organization-profile"

export type OrganizationSettingsProps = {
  children?: ReactNode
  className?: string
}

/**
 * Organization settings UI: profile details, plugin-contributed cards
 * (`organizationCards`), the host's own sections, then danger zone.
 */
export function OrganizationSettings({
  children,
  className,
  ...props
}: OrganizationSettingsProps & ComponentProps<"div">) {
  const { plugins } = useAuth()

  return (
    <SectionGroup className={className} {...props}>
      <OrganizationProfile />

      {plugins.flatMap((plugin) =>
        plugin.organizationCards?.map((Card, index) => (
          <Card key={`${plugin.id}-${index.toString()}`} />
        ))
      )}

      {children}

      <OrganizationDangerZone />
    </SectionGroup>
  )
}

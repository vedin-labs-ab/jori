import { useNavigate } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { type ComponentProps, useMemo } from "react"
import { type UsageDays } from "@/shared/console/folders/usage/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { ConsolePage } from "../../page"
import { FolderFrame } from "../frame"
import { UsageNote } from "./note"
import { FolderUsage } from "./view"

// The Usage pages, in their two scopes. Both keep the chosen window in the
// URL, so a view someone found worth reading is a view they can send on.
// Changing it replaces rather than stacks: flipping between windows is
// looking at one page, not visiting three.

/** The whole tree's spend hangs off the surface itself, so its crumb is the
 *  overview and then this page. */
const organizationCrumb = {
  name: "Usage",
  trail: [{ name: "Folders", to: "/folders" }],
}

export function FolderUsagePage({
  days,
  folderId,
}: {
  days: UsageDays
  folderId: string
}) {
  const navigate = useNavigate()

  return (
    <FolderFrame
      folderId={folderId}
      suffix={(organizationId) => (
        <UsageNote days={days} organizationId={organizationId} />
      )}
      view="usage"
    >
      {({ folder, organizationId }) => (
        <FolderUsage
          days={days}
          folderId={folder.folderId as GenericId<"folders">}
          onDaysChange={(next) =>
            void navigate({
              params: { folderId },
              replace: true,
              search: { days: next },
              to: "/folders/$folderId/usage",
            })
          }
          organizationId={organizationId}
        />
      )}
    </FolderFrame>
  )
}

export function OrganizationUsagePage({ days }: { days: UsageDays }) {
  const navigate = useNavigate()

  return (
    <ConsolePage>
      {(organizationId) => (
        <ConsoleListLayout>
          <OrganizationUsageView
            days={days}
            onDaysChange={(next) =>
              void navigate({
                replace: true,
                search: { days: next },
                to: "/folders/usage",
              })
            }
            organizationId={organizationId}
          />
        </ConsoleListLayout>
      )}
    </ConsolePage>
  )
}

/** The crumb is published from inside the shell, which ConsolePage mounts
 *  below the page itself: published from the page it would reach nobody. */
function OrganizationUsageView(props: ComponentProps<typeof FolderUsage>) {
  const { days, organizationId } = props

  useMaterialTrail(
    useMemo(
      () => ({
        ...organizationCrumb,
        suffix: <UsageNote days={days} organizationId={organizationId} />,
      }),
      [days, organizationId]
    )
  )

  return <FolderUsage {...props} />
}

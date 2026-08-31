import { useNavigate } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { ConsolePage } from "../../page"
import { ConsoleListLayout } from "../../shared/list/frame"
import { FolderFrame, FolderSurfaceTabs } from "../frame"
import { type UsageDays } from "./types"
import { UsageView } from "./view"

// The Usage tab, in its two scopes. Both keep the chosen window in the URL,
// so a view someone found worth reading is a view they can send on.
// Changing it replaces rather than stacks: flipping between windows is
// looking at one page, not visiting three.

export function FolderUsagePage({
  days,
  folderId,
}: {
  days: UsageDays
  folderId: string
}) {
  const navigate = useNavigate()

  return (
    <FolderFrame folderId={folderId} tab="usage">
      {(folder, organizationId) => (
        <UsageView
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
          <FolderSurfaceTabs tab="usage" />
          <UsageView
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

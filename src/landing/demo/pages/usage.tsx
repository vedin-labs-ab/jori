import { ClientOnly } from "@tanstack/react-router"
import { lazy, Suspense, useContext, useMemo } from "react"
import { UsageNoteButton } from "@/shared/console/folders/usage/note"
import { type UsageDays } from "@/shared/console/folders/usage/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "@/shared/console/materials/breadcrumb"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { NearViewport } from "../../viewport"
import { folderDetail } from "../derive/folders"
import { usageOverview } from "../derive/usage"
import { demoTimezone } from "../fixtures/jobs"
import { type FolderId } from "../fixtures/types"
import { type DemoState } from "../state/types"
import { useDemoWorkspace } from "../workspace"

// Recharts draws the charts and needs a laid-out box the server cannot
// give it, so the view arrives on the client, and lazily: it is the
// heaviest thing on the page.
const UsageView = lazy(async () => ({
  default: (await import("@/shared/console/folders/usage/view")).UsageView,
}))

/** The Usage page over the workspace, in either scope. The window rides in
 *  the mock's own location, so its links carry it the way the console's do. */
export function UsagePage({
  days,
  folderId,
}: {
  days: UsageDays
  /** Absent across the whole organization. */
  folderId?: FolderId
}) {
  const { state } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const usage = useMemo(
    () => usageOverview(state, folderId, days),
    [state, folderId, days]
  )

  useMaterialTrail(
    useMemo(() => usageCrumb(state, folderId, days), [state, folderId, days])
  )

  return (
    <ConsoleListLayout>
      <NearViewport
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        fallback={<ConsoleListLoading />}
      >
        <ClientOnly fallback={<ConsoleListLoading />}>
          <Suspense fallback={<ConsoleListLoading />}>
            <UsageView
              days={days}
              folderId={folderId}
              onDaysChange={(next) =>
                navigation?.navigate(
                  `${folderId === undefined ? "/folders/usage" : `/folders/${folderId}/usage`}?days=${next}`
                )
              }
              usage={usage}
            />
          </Suspense>
        </ClientOnly>
      </NearViewport>
    </ConsoleListLayout>
  )
}

/** The whole tree's spend hangs off the surface itself; a folder's hangs
 *  one more crumb off the folder's own trail. */
function usageCrumb(
  state: DemoState,
  folderId: FolderId | undefined,
  days: UsageDays
): MaterialBreadcrumb {
  const suffix = <UsageNoteButton days={days} timezone={demoTimezone} />
  const folder =
    folderId === undefined ? undefined : folderDetail(state, folderId)

  if (folder === undefined) {
    return {
      name: "Usage",
      suffix,
      trail: [{ name: "Folders", to: "/folders" }],
    }
  }

  return {
    name: "Usage",
    suffix,
    trail: [
      { name: "Folders", to: "/folders" },
      ...folder.path.map((segment) => ({
        name: segment.name,
        params: { folderId: segment.folderId },
        to: "/folders/$folderId",
      })),
    ],
  }
}

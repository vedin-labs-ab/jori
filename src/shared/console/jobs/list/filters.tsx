import { Plus } from "lucide-react"
import { type ReactNode } from "react"
import { countActiveFilters } from "../../filters/count"
import { ConsoleFilterToggle } from "../../filters/field"
import { ConsoleFiltered } from "../../filters/layout"
import { ConsoleHeaderButton, ConsoleSearch } from "../../layout"
import { type AudienceFilter, audienceFilterOptions } from "../../list/audience"
import { type JobFilter, jobFilterOptions } from "../types"

/** The Jobs page's chrome: search and New job in the header, and the
 *  Status and Visibility facets in the filter panel, around the list. */
export function JobFilters({
  audience,
  children,
  defaultStatus,
  onAudienceChange,
  onCreate,
  onCreateIntent,
  onQueryChange,
  onStatusChange,
  query,
  status,
}: {
  audience: AudienceFilter
  children: ReactNode
  /** The status the page opens on, which Reset returns to. */
  defaultStatus: JobFilter
  onAudienceChange: (audience: AudienceFilter) => void
  onCreate: () => void
  /** A hint that the editor is about to be needed, to load it early. */
  onCreateIntent?: () => unknown
  onQueryChange: (query: string) => void
  onStatusChange: (status: JobFilter) => void
  query: string
  status: JobFilter
}) {
  const preload = () => {
    void onCreateIntent?.()
  }

  return (
    <ConsoleFiltered
      actions={
        <>
          <ConsoleSearch
            label="Search jobs"
            onValueChange={onQueryChange}
            value={query}
          />
          <ConsoleHeaderButton
            icon={<Plus />}
            label="New job"
            onClick={() => {
              preload()
              onCreate()
            }}
            onFocus={preload}
            onPointerEnter={preload}
            type="button"
          />
        </>
      }
      activeCount={countActiveFilters(
        status !== defaultStatus,
        audience !== "all"
      )}
      onReset={() => {
        onStatusChange(defaultStatus)
        onAudienceChange("all")
      }}
      panel={
        <>
          <ConsoleFilterToggle
            label="Status"
            onValueChange={onStatusChange}
            options={jobFilterOptions}
            value={status}
          />
          <ConsoleFilterToggle
            label="Visibility"
            onValueChange={onAudienceChange}
            options={audienceFilterOptions}
            value={audience}
          />
        </>
      }
    >
      {children}
    </ConsoleFiltered>
  )
}

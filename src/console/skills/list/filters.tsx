import { Plus } from "lucide-react"
import { type ReactNode } from "react"
import { countActiveFilters } from "@/shared/console/filters/count"
import { ConsoleFilterToggle } from "@/shared/console/filters/field"
import { ConsoleFiltered } from "@/shared/console/filters/layout"
import { ConsoleHeaderButton, ConsoleSearch } from "@/shared/console/layout"
import { type SkillFilterView, skillFilterOptions } from "../types"

/** The Skills page's chrome: search and New skill in the header, and the
 *  Scope facet in the filter panel, around the list. */
export function SkillFilters({
  children,
  defaultView,
  isCreateDisabled,
  onCreate,
  onSearchChange,
  onViewChange,
  searchTerm,
  view,
}: {
  children: ReactNode
  /** The scope the page opens on, which Reset returns to. */
  defaultView: SkillFilterView
  isCreateDisabled: boolean
  onCreate: () => void
  onSearchChange: (searchTerm: string) => void
  onViewChange: (view: SkillFilterView) => void
  searchTerm: string
  view: SkillFilterView
}) {
  return (
    <ConsoleFiltered
      actions={
        <>
          <ConsoleSearch
            label="Search skills"
            onValueChange={onSearchChange}
            value={searchTerm}
          />
          <ConsoleHeaderButton
            className="w-fit"
            disabled={isCreateDisabled}
            icon={<Plus />}
            label="New skill"
            onClick={onCreate}
            type="button"
          />
        </>
      }
      activeCount={countActiveFilters(view !== defaultView)}
      onReset={() => onViewChange(defaultView)}
      panel={
        <ConsoleFilterToggle
          label="Scope"
          onValueChange={onViewChange}
          options={skillFilterOptions}
          value={view}
        />
      }
    >
      {children}
    </ConsoleFiltered>
  )
}

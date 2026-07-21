import { Plus } from "lucide-react"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "../../shared/layout"
import { type SkillFilterView, skillFilterOptions } from "../types"

export function SkillsToolbar({
  isCreateDisabled,
  onCreate,
  onSearchChange,
  onViewChange,
  searchTerm,
  view,
}: {
  isCreateDisabled: boolean
  onCreate: () => void
  onSearchChange: (searchTerm: string) => void
  onViewChange: (view: SkillFilterView) => void
  searchTerm: string
  view: SkillFilterView
}) {
  return (
    <>
      <ConsoleHeaderActions>
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
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Scope"
          onValueChange={onViewChange}
          options={skillFilterOptions}
          value={view}
        />
      </ConsoleFilterGroup>
    </>
  )
}

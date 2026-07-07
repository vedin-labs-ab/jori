import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
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
        <Button
          type="button"
          onClick={onCreate}
          disabled={isCreateDisabled}
          className="w-fit"
        >
          <Plus />
          New skill
        </Button>
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

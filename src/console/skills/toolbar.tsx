import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type SkillFilterView, skillFilterOptions } from "./types"

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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <SkillViewFilter onViewChange={onViewChange} view={view} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none">
        <SkillSearch onSearchChange={onSearchChange} searchTerm={searchTerm} />
        <Button
          type="button"
          onClick={onCreate}
          disabled={isCreateDisabled}
          className="w-fit"
        >
          <Plus />
          New skill
        </Button>
      </div>
    </div>
  )
}

function SkillViewFilter({
  onViewChange,
  view,
}: {
  onViewChange: (view: SkillFilterView) => void
  view: SkillFilterView
}) {
  return (
    <ToggleGroup
      className="flex-wrap justify-start"
      value={view}
      onValueChange={(value) => {
        if (value !== "") {
          onViewChange(value as SkillFilterView)
        }
      }}
      type="single"
      variant="outline"
    >
      {skillFilterOptions.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function SkillSearch({
  onSearchChange,
  searchTerm,
}: {
  onSearchChange: (searchTerm: string) => void
  searchTerm: string
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
      <Search
        aria-hidden="true"
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground"
      />
      <Input
        aria-label="Search skills"
        className="pr-2 pl-8"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search skills"
        value={searchTerm}
      />
    </div>
  )
}

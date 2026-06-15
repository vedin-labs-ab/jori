import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type SkillFilterView } from "./types"

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
      <SkillViewTabs onViewChange={onViewChange} view={view} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

function SkillViewTabs({
  onViewChange,
  view,
}: {
  onViewChange: (view: SkillFilterView) => void
  view: SkillFilterView
}) {
  return (
    <Tabs
      value={view}
      onValueChange={(value) => onViewChange(value as SkillFilterView)}
    >
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="tenant">Organization</TabsTrigger>
        <TabsTrigger value="global">Global</TabsTrigger>
      </TabsList>
    </Tabs>
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
    <div className="relative sm:w-80">
      <Search
        aria-hidden="true"
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
      />
      <Input
        aria-label="Search skills"
        className="pl-8"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search skills"
        value={searchTerm}
      />
    </div>
  )
}

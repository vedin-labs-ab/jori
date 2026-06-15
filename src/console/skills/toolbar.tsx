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
    <div className="grid gap-4">
      <SkillsTitleAction
        isCreateDisabled={isCreateDisabled}
        onCreate={onCreate}
      />
      <SkillsFilterBar
        onSearchChange={onSearchChange}
        onViewChange={onViewChange}
        searchTerm={searchTerm}
        view={view}
      />
    </div>
  )
}

function SkillsTitleAction({
  isCreateDisabled,
  onCreate,
}: {
  isCreateDisabled: boolean
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="grid gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-normal">
          Skills
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Reusable instructions Milo can apply when it works.
        </p>
      </div>
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
  )
}

function SkillsFilterBar({
  onSearchChange,
  onViewChange,
  searchTerm,
  view,
}: {
  onSearchChange: (searchTerm: string) => void
  onViewChange: (view: SkillFilterView) => void
  searchTerm: string
  view: SkillFilterView
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

      <div className="relative md:w-80">
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
    </div>
  )
}

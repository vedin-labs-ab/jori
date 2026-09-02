import { memo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  ConsoleFilterField,
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleSearch,
} from "../../layout"
import { type AudienceFilter, audienceFilterOptions } from "../../list/audience"
import {
  type ApprovalFilter,
  approvalFilterLabels,
  approvalFilterOptions,
  type RunFilter,
  runFilterOptions,
} from "../types"

/** The page's search, in the header, and the Status, Sharing, and
 *  Approval controls under it. */
export const ExecutionFilters = memo(function ExecutionFilters({
  approvalFilter,
  query,
  runFilter,
  audienceFilter,
  setApprovalFilter,
  setQuery,
  setRunFilter,
  setAudienceFilter,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  audienceFilter: AudienceFilter
  setApprovalFilter: (filter: ApprovalFilter) => void
  setQuery: (query: string) => void
  setRunFilter: (filter: RunFilter) => void
  setAudienceFilter: (filter: AudienceFilter) => void
}) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search runs"
          onValueChange={setQuery}
          placeholder="Search runs..."
          value={query}
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={setRunFilter}
          options={runFilterOptions}
          value={runFilter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={setAudienceFilter}
          options={audienceFilterOptions}
          value={audienceFilter}
        />
        <ConsoleFilterField label="Approval">
          <Select
            onValueChange={(value) =>
              setApprovalFilter(value as ApprovalFilter)
            }
            value={approvalFilter}
          >
            <SelectTrigger
              aria-label="Filter by approval state"
              className="w-fit"
            >
              <span className="font-medium">
                {approvalFilterLabels[approvalFilter]}
              </span>
            </SelectTrigger>
            <SelectContent align="start" position="popper">
              {approvalFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConsoleFilterField>
      </ConsoleFilterGroup>
    </>
  )
})

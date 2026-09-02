import { type ReactNode } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { countActiveFilters } from "../../filters/count"
import { ConsoleFilterField, ConsoleFilterToggle } from "../../filters/field"
import { ConsoleFiltered } from "../../filters/layout"
import { ConsoleSearch } from "../../layout"
import { type AudienceFilter, audienceFilterOptions } from "../../list/audience"
import {
  type ApprovalFilter,
  approvalFilterLabels,
  approvalFilterOptions,
  type RunFilter,
  runFilterOptions,
} from "../types"

/** The Activity page's chrome: the search in the header, and the Status,
 *  Visibility, and Approval facets in the filter panel, around the rows. */
export function ExecutionFilters({
  approvalFilter,
  audienceFilter,
  children,
  query,
  runFilter,
  setApprovalFilter,
  setAudienceFilter,
  setQuery,
  setRunFilter,
}: {
  approvalFilter: ApprovalFilter
  audienceFilter: AudienceFilter
  children: ReactNode
  query: string
  runFilter: RunFilter
  setApprovalFilter: (filter: ApprovalFilter) => void
  setAudienceFilter: (filter: AudienceFilter) => void
  setQuery: (query: string) => void
  setRunFilter: (filter: RunFilter) => void
}) {
  return (
    <ConsoleFiltered
      actions={
        <ConsoleSearch
          label="Search runs"
          onValueChange={setQuery}
          placeholder="Search runs..."
          value={query}
        />
      }
      activeCount={countActiveFilters(
        runFilter !== "all",
        audienceFilter !== "all",
        approvalFilter !== "any"
      )}
      onReset={() => {
        setRunFilter("all")
        setAudienceFilter("all")
        setApprovalFilter("any")
      }}
      panel={
        <>
          <ConsoleFilterToggle
            label="Status"
            onValueChange={setRunFilter}
            options={runFilterOptions}
            value={runFilter}
          />
          <ConsoleFilterToggle
            label="Visibility"
            onValueChange={setAudienceFilter}
            options={audienceFilterOptions}
            value={audienceFilter}
          />
          <ApprovalField onChange={setApprovalFilter} value={approvalFilter} />
        </>
      }
    >
      {children}
    </ConsoleFiltered>
  )
}

function ApprovalField({
  onChange,
  value,
}: {
  onChange: (filter: ApprovalFilter) => void
  value: ApprovalFilter
}) {
  return (
    <ConsoleFilterField label="Approval">
      <Select
        onValueChange={(next) => onChange(next as ApprovalFilter)}
        value={value}
      >
        <SelectTrigger aria-label="Filter by approval state" className="w-full">
          <span className="font-medium">{approvalFilterLabels[value]}</span>
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
  )
}

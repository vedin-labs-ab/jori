import { formatUsd } from "@contracts/billing"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Section, SectionHeader } from "@/components/ui/section"
import { cn } from "@/lib/utils"
import {
  type UsageDay,
  type UsageSegment,
  usageDayLabel,
  usageSegmentColor,
} from "@/shared/console/folders/usage/types"
import { SegmentLegend, SegmentSwatch } from "./legend"

// Spend and runs side by side, the same size, on the same days. Both are
// bars — a day either cost something or it did not — and each bar is
// stacked one level down the tree, so a spike says at once which folder
// made it. Both answer to one cursor, so a day read on one is lit on the
// other.

/** Recharts keeps the two charts' cursors on the same day by this name. */
const syncId = "usage"

const chartClassName = "aspect-auto h-48 w-full"

const chartMargin = { left: 0, right: 0, top: 4 }

/** Both axes take the same width, so the two charts' days line up. */
const axisWidth = 44

/** The hovered day, lit the same way on both charts. */
const cursor = { fill: "var(--muted)" }

type Measure = "micros" | "ended"

export function UsageCharts({
  segments,
  series,
}: {
  segments: UsageSegment[]
  series: UsageDay[]
}) {
  // Segments lifted out of both charts by their legend entries. Held here
  // rather than in the URL: it is a way of looking, not a view to send on.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current)

      if (!next.delete(key)) {
        next.add(key)
      }

      return next
    })
  const chart = { hidden, segments, series }

  return (
    <>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Section className="min-w-0">
          <SectionHeader title="Spend" />
          <StackedChart measure="micros" {...chart} />
        </Section>
        <Section className="min-w-0">
          <SectionHeader title="Runs" />
          <StackedChart measure="ended" {...chart} />
        </Section>
      </div>
      <SegmentLegend hidden={hidden} onToggle={toggle} segments={segments} />
    </>
  )
}

/** One measure of every day, each bar divided by segment. The day itself
 *  rides along under the segment keys, so the tooltip can state the whole
 *  as well as its parts. */
function StackedChart({
  hidden,
  measure,
  segments,
  series,
}: {
  hidden: ReadonlySet<string>
  measure: Measure
  segments: UsageSegment[]
  series: UsageDay[]
}) {
  const data = series.map((day) => ({
    day,
    ...Object.fromEntries(
      segments.map((segment) => [
        segment.key,
        day.segments[segment.key]?.[measure] ?? 0,
      ])
    ),
  }))

  return (
    <ChartContainer className={chartClassName} config={{}}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={chartMargin}
        syncId={syncId}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="day.date"
          minTickGap={24}
          tickFormatter={(value: string) => usageDayLabel(value)}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickFormatter={(value: number) => formatMeasure(measure, value)}
          tickLine={false}
          width={axisWidth}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            const day = payload?.[0]?.payload?.day as UsageDay | undefined

            return active && day !== undefined ? (
              <DayTooltip
                day={day}
                hidden={hidden}
                measure={measure}
                segments={segments}
              />
            ) : null
          }}
          cursor={cursor}
        />
        {segments.map((segment, rank) => (
          <Bar
            dataKey={segment.key}
            fill={usageSegmentColor(segment, rank)}
            hide={hidden.has(segment.key)}
            key={segment.key}
            stackId={measure}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/** The day as drawn: its shown parts in rank order, quiet parts left out,
 *  and their sum beneath, which is the bar's height. Runs also say how
 *  many went wrong — the one figure the stacks do not carry — while every
 *  part is shown, since it belongs to the whole day. */
function DayTooltip({
  day,
  hidden,
  measure,
  segments,
}: {
  day: UsageDay
  hidden: ReadonlySet<string>
  measure: Measure
  segments: UsageSegment[]
}) {
  const parts = segments.flatMap((segment, rank) => {
    const value = day.segments[segment.key]?.[measure] ?? 0

    return value === 0 || hidden.has(segment.key)
      ? []
      : [
          {
            color: usageSegmentColor(segment, rank),
            label: segment.label,
            value,
          },
        ]
  })
  const total = parts.reduce((sum, part) => sum + part.value, 0)

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <p className="font-medium">{usageDayLabel(day.date, "long")}</p>
      {parts.length === 0 ? null : (
        <div className="grid gap-1">
          {parts.map((part) => (
            <Figure key={part.label} label={part.label} swatch={part.color}>
              {formatMeasure(measure, part.value)}
            </Figure>
          ))}
        </div>
      )}
      <Figure className="border-t pt-1.5" label="Total">
        {formatMeasure(measure, total)}
        {measure === "ended" && hidden.size === 0 && day.failed > 0 ? (
          <span className="text-destructive"> · {day.failed} failed</span>
        ) : null}
      </Figure>
    </div>
  )
}

function Figure({
  children,
  className,
  label,
  swatch,
}: {
  children: React.ReactNode
  className?: string
  label: string
  swatch?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {swatch === undefined ? null : <SegmentSwatch color={swatch} />}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-medium tabular-nums">{children}</span>
    </div>
  )
}

function formatMeasure(measure: Measure, value: number) {
  return measure === "micros" ? formatUsd(value) : String(value)
}

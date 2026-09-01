import { formatUsd } from "@contracts/billing"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { type UsageDay, usageDayLabel } from "./types"

// Spend and runs, one above the other on the same days. Both are bars — a
// day either cost something or it did not — and both answer to one cursor,
// so a spike in one is read against the other without finding the date
// twice. The palette is the console's neutral ramp; failures alone earn a
// colour, the one the rest of the product already uses for something wrong.

const spendConfig = {
  micros: { label: "Spend", color: "var(--chart-3)" },
} satisfies ChartConfig

const runsConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--destructive)" },
} satisfies ChartConfig

/** Recharts keeps the two charts' cursors on the same day by this name. */
const syncId = "usage"

/** Wide and short: ninety bars have to stay readable, and the shape of the
 *  month is the point rather than the exact height of any one day. Spend
 *  is the chart the page is about, so it gets the taller of the two. */
const spendClassName = "aspect-auto h-40 w-full"
const runsClassName = "aspect-auto h-28 w-full"

const chartMargin = { left: 0, right: 0, top: 4 }

/** Both axes take the same width, so the two charts' days line up. */
const axisWidth = 44

/** The hovered day, lit the same way on both charts. */
const cursor = { fill: "var(--muted)" }

/** Absent series means a filtered window is still on its way. The boxes
 *  keep their height while it comes, so narrowing never moves the page. */
export function UsageCharts({ series }: { series: UsageDay[] | undefined }) {
  return (
    <div className="grid gap-4">
      {series === undefined ? (
        <>
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </>
      ) : (
        <>
          <SpendChart series={series} />
          <RunsChart series={series} />
        </>
      )}
    </div>
  )
}

function SpendChart({ series }: { series: UsageDay[] }) {
  return (
    <ChartContainer className={spendClassName} config={spendConfig}>
      <BarChart
        accessibilityLayer
        data={series}
        margin={chartMargin}
        syncId={syncId}
      >
        <CartesianGrid vertical={false} />
        <DayAxis />
        <YAxis
          axisLine={false}
          tickFormatter={(value: number) => formatUsd(value)}
          tickLine={false}
          width={axisWidth}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, _name, item) => (
                <DayFigures day={item.payload as UsageDay} />
              )}
              labelFormatter={(label) => usageDayLabel(String(label), "long")}
            />
          }
          cursor={cursor}
        />
        <Bar dataKey="micros" fill="var(--color-micros)" radius={2} />
      </BarChart>
    </ChartContainer>
  )
}

/** Runs stack rather than overlay: the bar's height is the day's ended
 *  runs, and the slice at its top is how many of those failed, so a bad day
 *  is visible without reading a legend. The day's box is drawn once, on the
 *  chart above; this one only lights the same day. */
function RunsChart({ series }: { series: UsageDay[] }) {
  const stacked = series.map((day) => ({
    ...day,
    completed: day.ended - day.failed,
  }))

  return (
    <ChartContainer className={runsClassName} config={runsConfig}>
      <BarChart
        accessibilityLayer
        data={stacked}
        margin={chartMargin}
        syncId={syncId}
      >
        <CartesianGrid vertical={false} />
        <DayAxis />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          width={axisWidth}
        />
        <ChartLegend
          align="left"
          content={<ChartLegendContent className="justify-start" />}
          verticalAlign="top"
        />
        <ChartTooltip content={() => null} cursor={cursor} />
        <Bar
          dataKey="completed"
          fill="var(--color-completed)"
          radius={[0, 0, 2, 2]}
          stackId="runs"
        />
        <Bar
          dataKey="failed"
          fill="var(--color-failed)"
          radius={[2, 2, 0, 0]}
          stackId="runs"
        />
      </BarChart>
    </ChartContainer>
  )
}

/** Ticks thin themselves out as the window grows, so a ninety-day axis
 *  reads as a handful of dates rather than a smear. */
function DayAxis() {
  return (
    <XAxis
      axisLine={false}
      dataKey="date"
      minTickGap={24}
      tickFormatter={(value: string) => usageDayLabel(value)}
      tickLine={false}
      tickMargin={8}
    />
  )
}

/** The whole day in one box: what it cost, what it ran, what went wrong. */
function DayFigures({ day }: { day: UsageDay }) {
  return (
    <div className="grid w-full gap-1">
      <Figure label="Spend" value={formatUsd(day.micros)} />
      <Figure label="Runs" value={day.ended} />
      <Figure
        className={day.failed > 0 ? "text-destructive" : undefined}
        label="Failed"
        value={day.failed}
      />
    </div>
  )
}

function Figure({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: string | number
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn("text-muted-foreground", className)}>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

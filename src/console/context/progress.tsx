import {
  BookOpen,
  Check,
  Compass,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type DiscoveryStep, type OrganizationDiscovery } from "./types"

const stepIcons = {
  reading: BookOpen,
  exploring: Compass,
  extracting: Sparkles,
  done: Check,
  error: TriangleAlert,
} as const

export function DiscoveryProgress({
  discovery,
}: {
  discovery: OrganizationDiscovery | undefined
}) {
  if (discovery === undefined || discovery === null) {
    return null
  }

  const running = discovery.status === "running"

  return (
    <ol className="grid gap-2.5">
      {discovery.steps.map((step, index) => (
        <StepRow
          key={`${step.at}-${step.kind}-${step.label}`}
          step={step}
          active={running && index === discovery.steps.length - 1}
        />
      ))}
    </ol>
  )
}

export function DiscoveryCard({
  discovery,
}: {
  discovery: OrganizationDiscovery | undefined
}) {
  if (
    discovery === undefined ||
    discovery === null ||
    discovery.status === "succeeded"
  ) {
    return null
  }

  const running = discovery.status === "running"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {running ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <TriangleAlert className="size-4 text-destructive" />
          )}
          {running ? "Exploring your website" : "Discovery didn't finish"}
        </CardTitle>
        <CardDescription>
          {running
            ? "Reading your site and drafting your organization profile."
            : (discovery.error ?? "Something went wrong.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DiscoveryProgress discovery={discovery} />
      </CardContent>
    </Card>
  )
}

function StepRow({ step, active }: { step: DiscoveryStep; active: boolean }) {
  const Icon = stepIcons[step.kind]

  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {active ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Icon className={cn("size-4", iconTone(step.kind))} />
        )}
      </span>
      <span className="grid gap-0.5">
        <span
          className={step.kind === "error" ? "text-destructive" : undefined}
        >
          {step.label}
        </span>
        {step.url === undefined ? null : (
          <span className="truncate text-xs text-muted-foreground">
            {step.url}
          </span>
        )}
      </span>
    </li>
  )
}

function iconTone(kind: DiscoveryStep["kind"]) {
  if (kind === "done") {
    return "text-foreground"
  }

  if (kind === "error") {
    return "text-destructive"
  }

  return "text-muted-foreground"
}

import { ShieldCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { type ArtifactDetail } from "./types"

export function ArtifactMeta({ artifact }: { artifact: ArtifactDetail }) {
  const currentVersion = artifact.versions.find((version) => version.isCurrent)

  return (
    <aside className="grid auto-rows-max gap-4 rounded-md border bg-card p-4">
      <div className="grid gap-1">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Access
        </div>
        <p className="text-muted-foreground text-sm">
          {artifact.access === "personal"
            ? "Owner-only within this organization."
            : "Available to organization members."}
        </p>
      </div>
      <Separator />
      <MetaRow label="Current version" value={artifact.versionId ?? "None"} />
      <MetaRow label="Tree" value={currentVersion?.treeId ?? "None"} />
      <MetaRow label="SDK" value={currentVersion?.sdk ?? "None"} />
      <MetaRow label="Updated" value={formatDate(artifact.updatedAt)} />
      <MetaRow
        label="Capabilities"
        value={String(artifact.capabilities.length)}
      />
      <MetaRow
        label="Automations"
        value={String(artifact.automations.length)}
      />
    </aside>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
      <dd className="break-all font-mono text-xs">{value}</dd>
    </div>
  )
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

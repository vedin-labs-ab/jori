import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "../../../convex/_generated/api"
import { LoadingMessage } from "../loading"
import { ConsolePage } from "../page"
import { SkillDialog } from "./dialog"
import { useSkillEditor } from "./editor"
import { SkillSection } from "./section"
import { type Skill } from "./types"

type SkillListResult =
  | {
      status: "ready"
      skills: Skill[]
    }
  | {
      status: "unauthorized"
      message: string
      skills: Skill[]
    }

export function Skills() {
  return (
    <ConsolePage>
      {(organization) => <SkillsCard tenantId={organization.id} />}
    </ConsolePage>
  )
}

export function SkillsCard({ tenantId }: { tenantId: string }) {
  const skillList = useQuery(api.skills.catalog.list, { tenantId })
  const editor = useSkillEditor(tenantId)
  const skills = skillList?.status === "ready" ? skillList.skills : undefined
  const groupedSkills = useMemo(
    () => (skills === undefined ? emptyGroupedSkills : groupSkills(skills)),
    [skills]
  )
  const isAccessReady = skillList?.status === "ready"

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <CardDescription>
          Teach Milo how your team works. Skills apply whenever the work matches
          their description.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            onClick={editor.openCreateForm}
            disabled={!isAccessReady}
          >
            <Plus />
            Add skill
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <SkillDeleteError error={editor.deleteError} />
        <SkillAccessError result={skillList} />
        {skillList?.status !== "unauthorized" ? (
          <SkillContent
            groupedSkills={groupedSkills}
            isLoading={skillList === undefined}
            onDelete={editor.deleteSkill}
            onEdit={editor.openEditForm}
            pendingSkillId={editor.pendingSkillId}
          />
        ) : null}
      </CardContent>
      <SkillDialog
        error={editor.formError}
        isOpen={editor.isFormOpen}
        isSaving={editor.pendingSkillId === (editor.formSkill?._id ?? "new")}
        onOpenChange={editor.setIsFormOpen}
        onSave={editor.saveSkill}
        onValuesChange={editor.setFormValues}
        skill={editor.formSkill}
        values={editor.formValues}
      />
    </Card>
  )
}

function SkillDeleteError({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Could not delete skill</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function SkillAccessError({ result }: { result: SkillListResult | undefined }) {
  if (result?.status !== "unauthorized") {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Skill access unavailable</AlertTitle>
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  )
}

function SkillContent({
  groupedSkills,
  isLoading,
  onDelete,
  onEdit,
  pendingSkillId,
}: {
  groupedSkills: ReturnType<typeof groupSkills>
  isLoading: boolean
  onDelete: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  pendingSkillId: string | undefined
}) {
  if (isLoading) {
    return <LoadingMessage label="Loading skills" />
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SkillSection
        description="Built-in skills ship with Milo and apply to every organization."
        emptyLabel="No built-in skills yet."
        pendingSkillId={pendingSkillId}
        skills={groupedSkills.global}
        title="Built-in"
      />
      <SkillSection
        description="Skills your team adds. They apply only to this organization."
        emptyLabel="No skills yet. Add one to teach Milo how your team works."
        onDelete={onDelete}
        onEdit={onEdit}
        pendingSkillId={pendingSkillId}
        skills={groupedSkills.tenant}
        title="Organization"
      />
    </div>
  )
}

const emptyGroupedSkills = {
  global: [],
  tenant: [],
} satisfies Record<Skill["scope"], Skill[]>

function groupSkills(skills: Skill[]) {
  return skills.reduce<Record<Skill["scope"], Skill[]>>(
    (groups, skill) => {
      groups[skill.scope].push(skill)
      return groups
    },
    { global: [], tenant: [] }
  )
}

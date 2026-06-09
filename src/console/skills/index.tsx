import { useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
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
import { readErrorMessage } from "../error"
import { LoadingMessage } from "../loading"
import { SkillDialog } from "./dialog"
import { SkillSection } from "./section"
import { emptySkillForm, type Skill, type SkillFormValues } from "./types"

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

export function SkillsCard({ tenantId }: { tenantId: string }) {
  const skillList = useQuery(api.skills.catalog.list, { tenantId })
  const editor = useSkillEditor(tenantId)
  const skills = skillList?.status === "ready" ? skillList.skills : undefined
  const groupedSkills = useMemo(() => groupSkills(skills), [skills])
  const isAccessReady = skillList?.status === "ready"

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <CardDescription>
          Teach Milo durable working habits for this organization.
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
        <SkillError error={editor.error} />
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

function useSkillEditor(tenantId: string) {
  const createSkill = useMutation(api.skills.catalog.create)
  const updateSkill = useMutation(api.skills.catalog.update)
  const removeSkill = useMutation(api.skills.catalog.remove)
  const [formSkill, setFormSkill] = useState<Skill>()
  const [formValues, setFormValues] = useState<SkillFormValues>(emptySkillForm)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingSkillId, setPendingSkillId] = useState<string>()
  const [error, setError] = useState<string>()

  function openCreateForm() {
    setError(undefined)
    setFormSkill(undefined)
    setFormValues(emptySkillForm)
    setIsFormOpen(true)
  }

  function openEditForm(skill: Skill) {
    setError(undefined)
    setFormSkill(skill)
    setFormValues(skill)
    setIsFormOpen(true)
  }

  async function saveSkill() {
    setPendingSkillId(formSkill?._id ?? "new")
    setError(undefined)
    try {
      await saveSkillForm()
      setIsFormOpen(false)
    } catch (saveError) {
      setError(readErrorMessage(saveError, "Could not save skill."))
    } finally {
      setPendingSkillId(undefined)
    }
  }

  async function saveSkillForm() {
    if (formSkill === undefined) {
      await createSkill({ tenantId, ...formValues })
      return
    }

    await updateSkill({ tenantId, skillId: formSkill._id, ...formValues })
  }

  async function deleteSkill(skill: Skill) {
    setPendingSkillId(skill._id)
    setError(undefined)
    try {
      await removeSkill({ tenantId, skillId: skill._id })
    } catch (deleteError) {
      setError(readErrorMessage(deleteError, "Could not delete skill."))
    } finally {
      setPendingSkillId(undefined)
    }
  }

  return {
    deleteSkill,
    error,
    formSkill,
    formValues,
    isFormOpen,
    openCreateForm,
    openEditForm,
    pendingSkillId,
    saveSkill,
    setFormValues,
    setIsFormOpen,
  }
}

function SkillError({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Skill update failed</AlertTitle>
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
        description="Built-in skills apply to every tenant and can only be changed by Milo administrators."
        emptyLabel="No global skills have been synced yet."
        pendingSkillId={pendingSkillId}
        skills={groupedSkills.global}
        title="Global"
      />
      <SkillSection
        description="Tenant skills apply only to this organization."
        emptyLabel="No tenant skills yet."
        onDelete={onDelete}
        onEdit={onEdit}
        pendingSkillId={pendingSkillId}
        skills={groupedSkills.tenant}
        title="Tenant"
      />
    </div>
  )
}

function groupSkills(skills: Skill[] | undefined) {
  return {
    global: skills?.filter((skill) => skill.scope === "global") ?? [],
    tenant: skills?.filter((skill) => skill.scope === "tenant") ?? [],
  }
}

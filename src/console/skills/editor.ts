import { type ReactMutation, useMutation } from "convex/react"
import { useState } from "react"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../convex/_generated/api"
import { emptySkillForm, type Skill, type SkillFormValues } from "./types"

export type SkillEditor = ReturnType<typeof useSkillEditor>

export function useSkillEditor(organizationId: string) {
  const [pendingSkillId, setPendingSkillId] = useState<string>()

  return {
    pendingSkillId,
    ...useSkillForm(organizationId, setPendingSkillId),
    ...useSkillDeletion(organizationId, setPendingSkillId),
  }
}

function useSkillForm(
  organizationId: string,
  setPendingSkillId: (skillId: string | undefined) => void
) {
  const createSkill = useMutation(api.skills.catalog.create)
  const updateSkill = useMutation(api.skills.catalog.update)
  const [formSkill, setFormSkill] = useState<Skill>()
  const [formValues, setFormValues] = useState<SkillFormValues>(emptySkillForm)
  const [isFormOpen, setIsFormOpen] = useState(false)

  function openForm(skill: Skill | undefined) {
    setFormSkill(skill)
    setFormValues(skill ?? emptySkillForm)
    setIsFormOpen(true)
  }

  async function saveSkill() {
    setPendingSkillId(formSkill?._id ?? "new")
    try {
      await persistSkill({
        createSkill,
        formSkill,
        formValues,
        organizationId,
        updateSkill,
      })
      setIsFormOpen(false)
    } catch (saveError) {
      showErrorToast(saveError, "Couldn't save the skill.")
    } finally {
      setPendingSkillId(undefined)
    }
  }

  return {
    formSkill,
    formValues,
    isFormOpen,
    openCreateForm: () => openForm(undefined),
    openEditForm: openForm,
    saveSkill,
    setFormValues,
    setIsFormOpen,
  }
}

async function persistSkill({
  createSkill,
  formSkill,
  formValues,
  organizationId,
  updateSkill,
}: {
  createSkill: ReactMutation<typeof api.skills.catalog.create>
  formSkill: Skill | undefined
  formValues: SkillFormValues
  organizationId: string
  updateSkill: ReactMutation<typeof api.skills.catalog.update>
}) {
  if (formSkill === undefined) {
    await createSkill({ organizationId, ...formValues })
    return
  }

  await updateSkill({ organizationId, skillId: formSkill._id, ...formValues })
}

function useSkillDeletion(
  organizationId: string,
  setPendingSkillId: (skillId: string | undefined) => void
) {
  const removeSkill = useMutation(api.skills.catalog.remove)

  async function deleteSkill(skill: Skill) {
    setPendingSkillId(skill._id)
    try {
      await removeSkill({ organizationId, skillId: skill._id })
    } catch (removeError) {
      showErrorToast(removeError, "Couldn't delete the skill.")
    } finally {
      setPendingSkillId(undefined)
    }
  }

  return { deleteSkill }
}

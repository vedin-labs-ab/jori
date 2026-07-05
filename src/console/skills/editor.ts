import { type ReactMutation, useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { emptySkillForm, type Skill, type SkillFormValues } from "./types"

export type SkillEditor = ReturnType<typeof useSkillEditor>

export function useSkillEditor(tenantId: string) {
  const [pendingSkillId, setPendingSkillId] = useState<string>()

  return {
    pendingSkillId,
    ...useSkillForm(tenantId, setPendingSkillId),
    ...useSkillDeletion(tenantId, setPendingSkillId),
  }
}

function useSkillForm(
  tenantId: string,
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
        tenantId,
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
  tenantId,
  updateSkill,
}: {
  createSkill: ReactMutation<typeof api.skills.catalog.create>
  formSkill: Skill | undefined
  formValues: SkillFormValues
  tenantId: string
  updateSkill: ReactMutation<typeof api.skills.catalog.update>
}) {
  if (formSkill === undefined) {
    await createSkill({ tenantId, ...formValues })
    return
  }

  await updateSkill({ tenantId, skillId: formSkill._id, ...formValues })
}

function useSkillDeletion(
  tenantId: string,
  setPendingSkillId: (skillId: string | undefined) => void
) {
  const removeSkill = useMutation(api.skills.catalog.remove)

  async function deleteSkill(skill: Skill) {
    setPendingSkillId(skill._id)
    try {
      await removeSkill({ tenantId, skillId: skill._id })
    } catch (removeError) {
      showErrorToast(removeError, "Couldn't delete the skill.")
    } finally {
      setPendingSkillId(undefined)
    }
  }

  return { deleteSkill }
}

import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../error"
import { type Skill } from "./types"

type GlobalSkillUpdateError = {
  message: string
  skillId: string
}

export function useGlobalSkillSettings(tenantId: string) {
  const setGlobalEnabled = useMutation(api.skills.settings.setGlobalEnabled)
  const [pendingSkillId, setPendingSkillId] = useState<string>()
  const [error, setError] = useState<GlobalSkillUpdateError>()

  async function updateGlobalSkillEnabled(skill: Skill, enabled: boolean) {
    setPendingSkillId(skill._id)
    setError(undefined)

    try {
      await setGlobalEnabled({ tenantId, skillId: skill._id, enabled })
    } catch (updateError) {
      setError({
        skillId: skill._id,
        message: readErrorMessage(updateError, "Could not update skill."),
      })
    } finally {
      setPendingSkillId(undefined)
    }
  }

  return {
    error,
    pendingSkillId,
    updateGlobalSkillEnabled,
  }
}

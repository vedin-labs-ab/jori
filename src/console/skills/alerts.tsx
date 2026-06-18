import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

export function SkillStatusAlerts({
  deleteError,
  result,
}: {
  deleteError: string | undefined
  result: SkillListResult | undefined
}) {
  return (
    <>
      <SkillDeleteError error={deleteError} />
      <SkillAccessError result={result} />
    </>
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

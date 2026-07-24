import { ShieldCheck } from "lucide-react"
import { LegalPlaceholder } from "./document"

export function PrivacyPage() {
  return (
    <LegalPlaceholder
      description="We're writing this with counsel, and it'll be published before Milo opens. What Milo can access, and when it acts, is already written down."
      icon={<ShieldCheck />}
      title="Privacy policy"
    />
  )
}

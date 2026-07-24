import { Scale } from "lucide-react"
import { LegalPlaceholder } from "./document"

export function TermsPage() {
  return (
    <LegalPlaceholder
      description="We're writing these with counsel, and they'll be published before Milo opens. What Milo can access, and when it acts, is already written down."
      icon={<Scale />}
      title="Terms of service"
    />
  )
}

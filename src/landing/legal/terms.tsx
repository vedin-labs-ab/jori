import { LegalDocument, type LegalSection } from "./document"

const placeholder =
  "Draft. Replaced by the counsel-reviewed terms before launch."

const sections: readonly LegalSection[] = [
  { heading: "The service", paragraphs: [placeholder] },
  { heading: "Accounts and organizations", paragraphs: [placeholder] },
  { heading: "Billing", paragraphs: [placeholder] },
  { heading: "Acceptable use", paragraphs: [placeholder] },
  { heading: "Liability", paragraphs: [placeholder] },
  { heading: "Termination", paragraphs: [placeholder] },
]

export function TermsPage() {
  return (
    <LegalDocument
      sections={sections}
      title="Terms of service"
      updated="July 2026"
    />
  )
}

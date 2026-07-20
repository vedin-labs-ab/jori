import { LegalDocument, type LegalSection } from "./document"

const placeholder =
  "Draft. Replaced by the counsel-reviewed policy before launch."

const sections: readonly LegalSection[] = [
  {
    heading: "What Milo collects",
    paragraphs: [placeholder],
  },
  {
    heading: "How access works",
    paragraphs: [
      "Milo reads and acts through the OAuth grants you approve, integration by integration. Revoking a grant ends its access.",
      placeholder,
    ],
  },
  {
    heading: "Subprocessors",
    paragraphs: [
      "Convex stores the data, including sign-in sessions. Trigger.dev executes runs. Resend delivers invitation emails. Model calls go through OpenRouter to the model provider.",
    ],
  },
  {
    heading: "Google API Services",
    paragraphs: [
      "Milo's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
    ],
  },
  {
    heading: "Model training",
    paragraphs: ["Your data is never used to train models."],
  },
  {
    heading: "Data retention",
    // TODO: replace with the retention commitment once decided.
    paragraphs: [placeholder],
  },
  {
    heading: "Your rights under GDPR",
    paragraphs: [placeholder],
  },
  {
    heading: "Contact",
    paragraphs: ["Questions about this policy: security@milo.app."],
  },
]

export function PrivacyPage() {
  return (
    <LegalDocument
      sections={sections}
      title="Privacy policy"
      updated="July 2026"
    />
  )
}

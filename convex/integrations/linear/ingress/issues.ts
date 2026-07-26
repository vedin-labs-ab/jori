import { type Doc } from "../../../_generated/dataModel"
import { requireLinearCredentials } from "../credentials"
import { linearGraphql } from "../graphql"

export type LinearIssueContext = {
  issueId: string
  teamId?: string
  projectId?: string
}

type LinearIssueContextResult = {
  data?: {
    issue?: {
      id?: string
      team?: {
        id?: string
      } | null
      project?: {
        id?: string
      } | null
    } | null
  }
}

export async function fetchLinearIssueContext(
  integration: Doc<"integrations">,
  issueId: string
): Promise<LinearIssueContext | null> {
  const credentials = requireLinearCredentials(integration)
  const result = await linearGraphql<LinearIssueContextResult>(
    credentials.tokens.access,
    {
      query: `
        query JoriAutomationIssueContext($id: String!) {
          issue(id: $id) {
            id
            team { id }
            project { id }
          }
        }
      `,
      variables: { id: issueId },
    }
  )
  const issue = result.data?.issue

  if (issue?.id === undefined) {
    return null
  }

  return {
    issueId: issue.id,
    teamId: issue.team?.id,
    projectId: issue.project?.id,
  }
}

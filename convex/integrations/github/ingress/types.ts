export type GitHubWebhookPayload = {
  action?: string
  installation?: {
    id?: number
    suspended_at?: string | null
  }
  repository?: GitHubRepository
  sender?: {
    id?: number
    login?: string
    type?: string
  }
  issue?: GitHubIssue
  pull_request?: GitHubPullRequest
  comment?: GitHubComment
}

export type GitHubRepository = {
  id?: number
  name?: string
  full_name?: string
  html_url?: string
  clone_url?: string
  default_branch?: string
  owner?: {
    login?: string
  }
}

type GitHubIssue = {
  id?: number
  number?: number
  title?: string
  body?: string
  html_url?: string
  pull_request?: {
    html_url?: string
    url?: string
  }
}

export type GitHubPullRequest = {
  id?: number
  number?: number
  title?: string
  body?: string
  merged?: boolean
  html_url?: string
  head?: {
    ref?: string
    sha?: string
  }
  base?: {
    ref?: string
    sha?: string
  }
}

export type GitHubComment = {
  id?: number
  node_id?: string
  author_association?: string
  body?: string
  html_url?: string
  url?: string
  created_at?: string
  updated_at?: string
  path?: string
  line?: number
  side?: string
  commit_id?: string
  in_reply_to_id?: number
  pull_request_review_id?: number
}

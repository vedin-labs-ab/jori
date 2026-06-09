export function createGitHubTokenPreflightCommand() {
  return githubTokenPreflightCommand
}

const githubTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GITHUB_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing GitHub token');",
  "  }",
  "  const response = await fetch('https://api.github.com/installation/repositories?per_page=1', {",
  "    headers: {",
  "      accept: 'application/vnd.github+json',",
  "      authorization: 'Bearer ' + token,",
  "      'x-github-api-version': '2022-11-28',",
  "    },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error('GitHub token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('GitHub token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

import { integrations as integrationEnum } from "../../integrations"
import { jobEventCatalog } from "../../jobs/events"
import { getGrantableToolPermissions } from "../../permissions"
import {
  numberProperty,
  objectProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

const jobInstructionsDescription =
  "Canonical Markdown instructions for each run. Use @Integration for every integration whose access is granted, /skill for skills, and #tool for tools. Use txt fences for plain-text examples that should keep Jori references active; language-tagged code fences are literal. Keep the explicit access payload aligned with every referenced tool."

const grantableJoriTools = getGrantableToolPermissions("jori").map(
  (permission) => permission.tool
)

const eventIntegrationEnum = jobEventCatalog.map(
  (definition) => definition.integration
)
const eventEnum = [
  ...new Set(
    jobEventCatalog.flatMap((definition) =>
      definition.events.map((event) => event.value)
    )
  ),
]

const accessSchema = () => ({
  ...objectSchema({
    required: ["integrations", "jori"],
    properties: {
      integrations: {
        type: "array",
        description:
          "Integration tools this job may use. Select exact tool names from the permission catalog.",
        items: objectSchema({
          required: ["integration", "tools"],
          properties: {
            integration: {
              type: "string",
              enum: integrationEnum,
              description: "Connected integration.",
            },
            tools: {
              type: "array",
              description:
                "Exact tool names this job may use for this integration.",
              items: { type: "string" },
            },
          },
        }),
      },
      jori: {
        type: "array",
        description:
          "Jori's own tools this job may use: tables, stores, files, web, the sandbox, agents, and jobs. Grant the smallest set the instructions need, and leave out web, sandbox, and job tools unless the work calls for them. Grant start_agent together with wait_for_agents and stop_agent. Replying, finishing, and loading skills need no grant.",
        items: { type: "string", enum: grantableJoriTools },
      },
    },
  }),
  description:
    "The tools each job run may use. A run can use nothing outside it, and a job cannot hold a tool the run creating it lacks.",
})

const visibilityProperty = {
  type: "string",
  enum: ["private", "organization"],
  description:
    "Who this job is for. private: only the requester can see and manage it, and its runs stay theirs. organization: every member can see and manage it, and its runs are visible to the whole organization. Omit to default from the tools: anything touching the requester's own email or calendar stays private; pure workspace-tool jobs become organization.",
}

const triggerSchema = () => ({
  description:
    "Type-specific trigger payload. Pair with the top-level job type.",
  oneOf: [
    objectSchema({
      required: ["at"],
      properties: {
        at: stringProperty("Future ISO timestamp in UTC, ending with Z."),
      },
    }),
    objectSchema({
      required: ["expression", "timezone"],
      properties: {
        expression: stringProperty(
          "Five-field cron expression interpreted in the supplied timezone."
        ),
        timezone: stringProperty("IANA timezone for the cron expression."),
      },
    }),
    objectSchema({
      required: ["integration", "event"],
      properties: {
        integration: {
          type: "string",
          enum: eventIntegrationEnum,
          description: "Connected integration that emits the event.",
        },
        event: {
          type: "string",
          description: "Supported event name for the selected integration.",
          enum: eventEnum,
        },
        match: objectProperty(
          'Normalized event match keyed by catalog parameter name, such as {"channel":"C123"} or {"repo":"owner/repo","issue":"123"}.'
        ),
      },
    }),
  ],
})

export const jobJoriToolInputSchemas = {
  add_job: objectSchema({
    required: ["name", "instructions", "type", "trigger", "access"],
    properties: {
      key: stringProperty(
        "Optional stable idempotency key. Reusing it for the same owner returns the existing equivalent job and rejects conflicting configuration."
      ),
      name: stringProperty("Short job name."),
      instructions: stringProperty(jobInstructionsDescription),
      visibility: visibilityProperty,
      type: {
        type: "string",
        enum: ["once", "cron", "event"],
        description: "Job trigger kind.",
      },
      trigger: triggerSchema(),
      access: accessSchema(),
    },
  }),
  search_jobs: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against job names and instructions."
      ),
      includeCompleted: {
        type: "boolean",
        description: "Also return completed jobs.",
      },
      limit: numberProperty("Maximum number of jobs to return."),
    },
  }),
  read_job: objectSchema({
    required: ["jobId"],
    properties: {
      jobId: stringProperty("Jori job ID."),
    },
  }),
  update_job: objectSchema({
    required: ["jobId"],
    properties: {
      jobId: stringProperty("Jori job ID."),
      name: stringProperty("Updated job name."),
      instructions: stringProperty(jobInstructionsDescription),
      visibility: visibilityProperty,
      type: {
        type: "string",
        enum: ["once", "cron", "event"],
        description:
          "New job trigger kind. Include a matching trigger when changing type.",
      },
      trigger: triggerSchema(),
      access: accessSchema(),
    },
  }),
  delete_job: objectSchema({
    required: ["jobId"],
    properties: {
      jobId: stringProperty("Jori job ID."),
    },
  }),
}

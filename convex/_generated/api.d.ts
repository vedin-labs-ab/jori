/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attention_activations from "../attention/activations.js";
import type * as context_integrations from "../context/integrations.js";
import type * as context_messages from "../context/messages.js";
import type * as http from "../http.js";
import type * as identity_organization from "../identity/organization.js";
import type * as prompts_generated from "../prompts/generated.js";
import type * as providers_slack_config from "../providers/slack/config.js";
import type * as providers_slack_credentials from "../providers/slack/credentials.js";
import type * as providers_slack_data from "../providers/slack/data.js";
import type * as providers_slack_events from "../providers/slack/events.js";
import type * as providers_slack_gate from "../providers/slack/gate.js";
import type * as providers_slack_install from "../providers/slack/install.js";
import type * as providers_slack_signing from "../providers/slack/signing.js";
import type * as runs_codex from "../runs/codex.js";
import type * as runs_e2b from "../runs/e2b.js";
import type * as runs_executions from "../runs/executions.js";
import type * as runs_harness from "../runs/harness.js";
import type * as runs_milo from "../runs/milo.js";
import type * as runs_prompt from "../runs/prompt.js";
import type * as runs_proxy from "../runs/proxy.js";
import type * as runs_runtime from "../runs/runtime.js";
import type * as runs_slack from "../runs/slack.js";
import type * as runs_tokens from "../runs/tokens.js";
import type * as runs_tools from "../runs/tools.js";
import type * as runs_trace from "../runs/trace.js";
import type * as scheduling_cron from "../scheduling/cron.js";
import type * as scheduling_data from "../scheduling/data.js";
import type * as scheduling_mcp from "../scheduling/mcp.js";
import type * as scheduling_schedules from "../scheduling/schedules.js";
import type * as scheduling_timing from "../scheduling/timing.js";
import type * as schemas_activations from "../schemas/activations.js";
import type * as schemas_executions from "../schemas/executions.js";
import type * as schemas_integrations from "../schemas/integrations.js";
import type * as schemas_messages from "../schemas/messages.js";
import type * as schemas_schedules from "../schemas/schedules.js";
import type * as schemas_skills from "../schemas/skills.js";
import type * as schemas_traces from "../schemas/traces.js";
import type * as schemas_triggers from "../schemas/triggers.js";
import type * as skills_access from "../skills/access.js";
import type * as skills_catalog from "../skills/catalog.js";
import type * as skills_data from "../skills/data.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "attention/activations": typeof attention_activations;
  "context/integrations": typeof context_integrations;
  "context/messages": typeof context_messages;
  http: typeof http;
  "identity/organization": typeof identity_organization;
  "prompts/generated": typeof prompts_generated;
  "providers/slack/config": typeof providers_slack_config;
  "providers/slack/credentials": typeof providers_slack_credentials;
  "providers/slack/data": typeof providers_slack_data;
  "providers/slack/events": typeof providers_slack_events;
  "providers/slack/gate": typeof providers_slack_gate;
  "providers/slack/install": typeof providers_slack_install;
  "providers/slack/signing": typeof providers_slack_signing;
  "runs/codex": typeof runs_codex;
  "runs/e2b": typeof runs_e2b;
  "runs/executions": typeof runs_executions;
  "runs/harness": typeof runs_harness;
  "runs/milo": typeof runs_milo;
  "runs/prompt": typeof runs_prompt;
  "runs/proxy": typeof runs_proxy;
  "runs/runtime": typeof runs_runtime;
  "runs/slack": typeof runs_slack;
  "runs/tokens": typeof runs_tokens;
  "runs/tools": typeof runs_tools;
  "runs/trace": typeof runs_trace;
  "scheduling/cron": typeof scheduling_cron;
  "scheduling/data": typeof scheduling_data;
  "scheduling/mcp": typeof scheduling_mcp;
  "scheduling/schedules": typeof scheduling_schedules;
  "scheduling/timing": typeof scheduling_timing;
  "schemas/activations": typeof schemas_activations;
  "schemas/executions": typeof schemas_executions;
  "schemas/integrations": typeof schemas_integrations;
  "schemas/messages": typeof schemas_messages;
  "schemas/schedules": typeof schemas_schedules;
  "schemas/skills": typeof schemas_skills;
  "schemas/traces": typeof schemas_traces;
  "schemas/triggers": typeof schemas_triggers;
  "skills/access": typeof skills_access;
  "skills/catalog": typeof skills_catalog;
  "skills/data": typeof skills_data;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

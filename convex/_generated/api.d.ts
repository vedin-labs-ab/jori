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
import type * as identity_identities from "../identity/identities.js";
import type * as identity_organization from "../identity/organization.js";
import type * as identity_users from "../identity/users.js";
import type * as permissions_catalog from "../permissions/catalog.js";
import type * as permissions_data from "../permissions/data.js";
import type * as permissions_tools from "../permissions/tools.js";
import type * as prompts_generated from "../prompts/generated.js";
import type * as providers_data from "../providers/data.js";
import type * as providers_github_app from "../providers/github/app.js";
import type * as providers_github_config from "../providers/github/config.js";
import type * as providers_github_credentials from "../providers/github/credentials.js";
import type * as providers_github_data from "../providers/github/data.js";
import type * as providers_github_events from "../providers/github/events.js";
import type * as providers_github_gate from "../providers/github/gate.js";
import type * as providers_github_http from "../providers/github/http.js";
import type * as providers_github_install from "../providers/github/install.js";
import type * as providers_github_signing from "../providers/github/signing.js";
import type * as providers_github_types from "../providers/github/types.js";
import type * as providers_google_config from "../providers/google/config.js";
import type * as providers_google_credentials from "../providers/google/credentials.js";
import type * as providers_google_data from "../providers/google/data.js";
import type * as providers_google_http from "../providers/google/http.js";
import type * as providers_google_install from "../providers/google/install.js";
import type * as providers_google_oauth from "../providers/google/oauth.js";
import type * as providers_google_signing from "../providers/google/signing.js";
import type * as providers_http from "../providers/http.js";
import type * as providers_linear_config from "../providers/linear/config.js";
import type * as providers_linear_credentials from "../providers/linear/credentials.js";
import type * as providers_linear_data from "../providers/linear/data.js";
import type * as providers_linear_events from "../providers/linear/events.js";
import type * as providers_linear_gate from "../providers/linear/gate.js";
import type * as providers_linear_http from "../providers/linear/http.js";
import type * as providers_linear_install from "../providers/linear/install.js";
import type * as providers_linear_oauth from "../providers/linear/oauth.js";
import type * as providers_linear_signing from "../providers/linear/signing.js";
import type * as providers_microsoft_config from "../providers/microsoft/config.js";
import type * as providers_microsoft_credentials from "../providers/microsoft/credentials.js";
import type * as providers_microsoft_data from "../providers/microsoft/data.js";
import type * as providers_microsoft_http from "../providers/microsoft/http.js";
import type * as providers_microsoft_identity from "../providers/microsoft/identity.js";
import type * as providers_microsoft_install from "../providers/microsoft/install.js";
import type * as providers_microsoft_oauth from "../providers/microsoft/oauth.js";
import type * as providers_microsoft_signing from "../providers/microsoft/signing.js";
import type * as providers_signing from "../providers/signing.js";
import type * as providers_slack_config from "../providers/slack/config.js";
import type * as providers_slack_credentials from "../providers/slack/credentials.js";
import type * as providers_slack_data from "../providers/slack/data.js";
import type * as providers_slack_events from "../providers/slack/events.js";
import type * as providers_slack_gate from "../providers/slack/gate.js";
import type * as providers_slack_http from "../providers/slack/http.js";
import type * as providers_slack_install from "../providers/slack/install.js";
import type * as providers_slack_signing from "../providers/slack/signing.js";
import type * as runs_bundles from "../runs/bundles.js";
import type * as runs_codex from "../runs/codex.js";
import type * as runs_data from "../runs/data.js";
import type * as runs_executions from "../runs/executions.js";
import type * as runs_integrations from "../runs/integrations.js";
import type * as runs_prompt from "../runs/prompt.js";
import type * as runs_runtime from "../runs/runtime.js";
import type * as runs_sandbox_e2b from "../runs/sandbox/e2b.js";
import type * as runs_sandbox_harness from "../runs/sandbox/harness.js";
import type * as runs_sandbox_preflights from "../runs/sandbox/preflights.js";
import type * as runs_targets from "../runs/targets.js";
import type * as runs_tokens from "../runs/tokens.js";
import type * as runs_tools_github from "../runs/tools/github.js";
import type * as runs_tools_google from "../runs/tools/google.js";
import type * as runs_tools_index from "../runs/tools/index.js";
import type * as runs_tools_linear from "../runs/tools/linear.js";
import type * as runs_tools_microsoft from "../runs/tools/microsoft.js";
import type * as runs_tools_milo from "../runs/tools/milo.js";
import type * as runs_tools_policy from "../runs/tools/policy.js";
import type * as runs_tools_proxy from "../runs/tools/proxy.js";
import type * as runs_tools_slack from "../runs/tools/slack.js";
import type * as runs_tools_types from "../runs/tools/types.js";
import type * as runs_trace from "../runs/trace.js";
import type * as scheduling_cron from "../scheduling/cron.js";
import type * as scheduling_data from "../scheduling/data.js";
import type * as scheduling_mcp from "../scheduling/mcp.js";
import type * as scheduling_schedules from "../scheduling/schedules.js";
import type * as scheduling_timing from "../scheduling/timing.js";
import type * as schemas_activations from "../schemas/activations.js";
import type * as schemas_executions from "../schemas/executions.js";
import type * as schemas_identities from "../schemas/identities.js";
import type * as schemas_integrations from "../schemas/integrations.js";
import type * as schemas_messages from "../schemas/messages.js";
import type * as schemas_permissions from "../schemas/permissions.js";
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
  "identity/identities": typeof identity_identities;
  "identity/organization": typeof identity_organization;
  "identity/users": typeof identity_users;
  "permissions/catalog": typeof permissions_catalog;
  "permissions/data": typeof permissions_data;
  "permissions/tools": typeof permissions_tools;
  "prompts/generated": typeof prompts_generated;
  "providers/data": typeof providers_data;
  "providers/github/app": typeof providers_github_app;
  "providers/github/config": typeof providers_github_config;
  "providers/github/credentials": typeof providers_github_credentials;
  "providers/github/data": typeof providers_github_data;
  "providers/github/events": typeof providers_github_events;
  "providers/github/gate": typeof providers_github_gate;
  "providers/github/http": typeof providers_github_http;
  "providers/github/install": typeof providers_github_install;
  "providers/github/signing": typeof providers_github_signing;
  "providers/github/types": typeof providers_github_types;
  "providers/google/config": typeof providers_google_config;
  "providers/google/credentials": typeof providers_google_credentials;
  "providers/google/data": typeof providers_google_data;
  "providers/google/http": typeof providers_google_http;
  "providers/google/install": typeof providers_google_install;
  "providers/google/oauth": typeof providers_google_oauth;
  "providers/google/signing": typeof providers_google_signing;
  "providers/http": typeof providers_http;
  "providers/linear/config": typeof providers_linear_config;
  "providers/linear/credentials": typeof providers_linear_credentials;
  "providers/linear/data": typeof providers_linear_data;
  "providers/linear/events": typeof providers_linear_events;
  "providers/linear/gate": typeof providers_linear_gate;
  "providers/linear/http": typeof providers_linear_http;
  "providers/linear/install": typeof providers_linear_install;
  "providers/linear/oauth": typeof providers_linear_oauth;
  "providers/linear/signing": typeof providers_linear_signing;
  "providers/microsoft/config": typeof providers_microsoft_config;
  "providers/microsoft/credentials": typeof providers_microsoft_credentials;
  "providers/microsoft/data": typeof providers_microsoft_data;
  "providers/microsoft/http": typeof providers_microsoft_http;
  "providers/microsoft/identity": typeof providers_microsoft_identity;
  "providers/microsoft/install": typeof providers_microsoft_install;
  "providers/microsoft/oauth": typeof providers_microsoft_oauth;
  "providers/microsoft/signing": typeof providers_microsoft_signing;
  "providers/signing": typeof providers_signing;
  "providers/slack/config": typeof providers_slack_config;
  "providers/slack/credentials": typeof providers_slack_credentials;
  "providers/slack/data": typeof providers_slack_data;
  "providers/slack/events": typeof providers_slack_events;
  "providers/slack/gate": typeof providers_slack_gate;
  "providers/slack/http": typeof providers_slack_http;
  "providers/slack/install": typeof providers_slack_install;
  "providers/slack/signing": typeof providers_slack_signing;
  "runs/bundles": typeof runs_bundles;
  "runs/codex": typeof runs_codex;
  "runs/data": typeof runs_data;
  "runs/executions": typeof runs_executions;
  "runs/integrations": typeof runs_integrations;
  "runs/prompt": typeof runs_prompt;
  "runs/runtime": typeof runs_runtime;
  "runs/sandbox/e2b": typeof runs_sandbox_e2b;
  "runs/sandbox/harness": typeof runs_sandbox_harness;
  "runs/sandbox/preflights": typeof runs_sandbox_preflights;
  "runs/targets": typeof runs_targets;
  "runs/tokens": typeof runs_tokens;
  "runs/tools/github": typeof runs_tools_github;
  "runs/tools/google": typeof runs_tools_google;
  "runs/tools/index": typeof runs_tools_index;
  "runs/tools/linear": typeof runs_tools_linear;
  "runs/tools/microsoft": typeof runs_tools_microsoft;
  "runs/tools/milo": typeof runs_tools_milo;
  "runs/tools/policy": typeof runs_tools_policy;
  "runs/tools/proxy": typeof runs_tools_proxy;
  "runs/tools/slack": typeof runs_tools_slack;
  "runs/tools/types": typeof runs_tools_types;
  "runs/trace": typeof runs_trace;
  "scheduling/cron": typeof scheduling_cron;
  "scheduling/data": typeof scheduling_data;
  "scheduling/mcp": typeof scheduling_mcp;
  "scheduling/schedules": typeof scheduling_schedules;
  "scheduling/timing": typeof scheduling_timing;
  "schemas/activations": typeof schemas_activations;
  "schemas/executions": typeof schemas_executions;
  "schemas/identities": typeof schemas_identities;
  "schemas/integrations": typeof schemas_integrations;
  "schemas/messages": typeof schemas_messages;
  "schemas/permissions": typeof schemas_permissions;
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

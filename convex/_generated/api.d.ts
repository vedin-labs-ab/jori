/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals_approvals from "../approvals/approvals.js";
import type * as approvals_console from "../approvals/console.js";
import type * as approvals_runtime from "../approvals/runtime.js";
import type * as attention_activations from "../attention/activations.js";
import type * as broker_approval_args from "../broker/approval/args.js";
import type * as broker_approvals from "../broker/approvals.js";
import type * as broker_mcp from "../broker/mcp.js";
import type * as broker_providers from "../broker/providers.js";
import type * as broker_providers_common from "../broker/providers/common.js";
import type * as broker_providers_github_format from "../broker/providers/github/format.js";
import type * as broker_providers_github_index from "../broker/providers/github/index.js";
import type * as broker_providers_google_format from "../broker/providers/google/format.js";
import type * as broker_providers_google_gmail from "../broker/providers/google/gmail.js";
import type * as broker_providers_google_index from "../broker/providers/google/index.js";
import type * as broker_providers_google_request from "../broker/providers/google/request.js";
import type * as broker_providers_linear from "../broker/providers/linear.js";
import type * as broker_providers_microsoft from "../broker/providers/microsoft.js";
import type * as broker_providers_notion from "../broker/providers/notion.js";
import type * as broker_providers_slack from "../broker/providers/slack.js";
import type * as executions_approval from "../executions/approval.js";
import type * as executions_approvals from "../executions/approvals.js";
import type * as executions_artifacts from "../executions/artifacts.js";
import type * as executions_bundles from "../executions/bundles.js";
import type * as executions_codex from "../executions/codex.js";
import type * as executions_continuation from "../executions/continuation.js";
import type * as executions_control from "../executions/control.js";
import type * as executions_data from "../executions/data.js";
import type * as executions_execute from "../executions/execute.js";
import type * as executions_instructions from "../executions/instructions.js";
import type * as executions_integrations from "../executions/integrations.js";
import type * as executions_labels from "../executions/labels.js";
import type * as executions_list from "../executions/list.js";
import type * as executions_monitor from "../executions/monitor.js";
import type * as executions_pending from "../executions/pending.js";
import type * as executions_prompt from "../executions/prompt.js";
import type * as executions_records from "../executions/records.js";
import type * as executions_runtime from "../executions/runtime.js";
import type * as executions_sandbox_e2b from "../executions/sandbox/e2b.js";
import type * as executions_sandbox_harness from "../executions/sandbox/harness.js";
import type * as executions_sandbox_preflights from "../executions/sandbox/preflights.js";
import type * as executions_skills from "../executions/skills.js";
import type * as executions_summaries from "../executions/summaries.js";
import type * as executions_targets from "../executions/targets.js";
import type * as executions_tokens from "../executions/tokens.js";
import type * as executions_tools_adapter from "../executions/tools/adapter.js";
import type * as executions_tools_assemble from "../executions/tools/assemble.js";
import type * as executions_tools_definitions from "../executions/tools/definitions.js";
import type * as executions_tools_github_bundle from "../executions/tools/github/bundle.js";
import type * as executions_tools_github_index from "../executions/tools/github/index.js";
import type * as executions_tools_github_preflight from "../executions/tools/github/preflight.js";
import type * as executions_tools_google_bundle from "../executions/tools/google/bundle.js";
import type * as executions_tools_google_index from "../executions/tools/google/index.js";
import type * as executions_tools_google_preflight from "../executions/tools/google/preflight.js";
import type * as executions_tools_index from "../executions/tools/index.js";
import type * as executions_tools_linear_bundle from "../executions/tools/linear/bundle.js";
import type * as executions_tools_linear_index from "../executions/tools/linear/index.js";
import type * as executions_tools_linear_preflight from "../executions/tools/linear/preflight.js";
import type * as executions_tools_microsoft_bundle from "../executions/tools/microsoft/bundle.js";
import type * as executions_tools_microsoft_index from "../executions/tools/microsoft/index.js";
import type * as executions_tools_microsoft_preflight from "../executions/tools/microsoft/preflight.js";
import type * as executions_tools_milo_bundle from "../executions/tools/milo/bundle.js";
import type * as executions_tools_milo_index from "../executions/tools/milo/index.js";
import type * as executions_tools_milo_script from "../executions/tools/milo/script.js";
import type * as executions_tools_notion_bundle from "../executions/tools/notion/bundle.js";
import type * as executions_tools_notion_index from "../executions/tools/notion/index.js";
import type * as executions_tools_notion_preflight from "../executions/tools/notion/preflight.js";
import type * as executions_tools_policy from "../executions/tools/policy.js";
import type * as executions_tools_resolve from "../executions/tools/resolve.js";
import type * as executions_tools_schemas_common from "../executions/tools/schemas/common.js";
import type * as executions_tools_schemas_github from "../executions/tools/schemas/github.js";
import type * as executions_tools_schemas_google from "../executions/tools/schemas/google.js";
import type * as executions_tools_schemas_index from "../executions/tools/schemas/index.js";
import type * as executions_tools_schemas_linear from "../executions/tools/schemas/linear.js";
import type * as executions_tools_schemas_microsoft from "../executions/tools/schemas/microsoft.js";
import type * as executions_tools_schemas_milo from "../executions/tools/schemas/milo.js";
import type * as executions_tools_schemas_notion from "../executions/tools/schemas/notion.js";
import type * as executions_tools_schemas_slack from "../executions/tools/schemas/slack.js";
import type * as executions_tools_slack_bundle from "../executions/tools/slack/bundle.js";
import type * as executions_tools_slack_index from "../executions/tools/slack/index.js";
import type * as executions_tools_slack_preflight from "../executions/tools/slack/preflight.js";
import type * as executions_tools_types from "../executions/tools/types.js";
import type * as executions_trace from "../executions/trace.js";
import type * as executions_triggers from "../executions/triggers.js";
import type * as http from "../http.js";
import type * as identity_clerk from "../identity/clerk.js";
import type * as identity_clerkData from "../identity/clerkData.js";
import type * as identity_clerkProfile from "../identity/clerkProfile.js";
import type * as identity_identities from "../identity/identities.js";
import type * as identity_organization from "../identity/organization.js";
import type * as identity_users from "../identity/users.js";
import type * as integrations_data from "../integrations/data.js";
import type * as integrations_disconnect from "../integrations/disconnect.js";
import type * as integrations_revoke from "../integrations/revoke.js";
import type * as integrations_status from "../integrations/status.js";
import type * as maintenance_truncate from "../maintenance/truncate.js";
import type * as messages_ingest from "../messages/ingest.js";
import type * as openrouter_client from "../openrouter/client.js";
import type * as openrouter_index from "../openrouter/index.js";
import type * as permissions_catalog from "../permissions/catalog.js";
import type * as permissions_data from "../permissions/data.js";
import type * as permissions_github from "../permissions/github.js";
import type * as permissions_notion from "../permissions/notion.js";
import type * as permissions_tools from "../permissions/tools.js";
import type * as prompts_generated from "../prompts/generated.js";
import type * as prompts_render from "../prompts/render.js";
import type * as prompts_time from "../prompts/time.js";
import type * as providers_catalog from "../providers/catalog.js";
import type * as providers_credentials from "../providers/credentials.js";
import type * as providers_data from "../providers/data.js";
import type * as providers_github_app from "../providers/github/app.js";
import type * as providers_github_config from "../providers/github/config.js";
import type * as providers_github_credentials from "../providers/github/credentials.js";
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
import type * as providers_notion_config from "../providers/notion/config.js";
import type * as providers_notion_credentials from "../providers/notion/credentials.js";
import type * as providers_notion_data from "../providers/notion/data.js";
import type * as providers_notion_http from "../providers/notion/http.js";
import type * as providers_notion_install from "../providers/notion/install.js";
import type * as providers_notion_oauth from "../providers/notion/oauth.js";
import type * as providers_notion_signing from "../providers/notion/signing.js";
import type * as providers_oauth from "../providers/oauth.js";
import type * as providers_signing from "../providers/signing.js";
import type * as providers_slack_approval_blocks from "../providers/slack/approval/blocks.js";
import type * as providers_slack_approval_cards from "../providers/slack/approval/cards.js";
import type * as providers_slack_approval_labels from "../providers/slack/approval/labels.js";
import type * as providers_slack_approvals from "../providers/slack/approvals.js";
import type * as providers_slack_config from "../providers/slack/config.js";
import type * as providers_slack_credentials from "../providers/slack/credentials.js";
import type * as providers_slack_data from "../providers/slack/data.js";
import type * as providers_slack_events from "../providers/slack/events.js";
import type * as providers_slack_gate from "../providers/slack/gate.js";
import type * as providers_slack_http from "../providers/slack/http.js";
import type * as providers_slack_install from "../providers/slack/install.js";
import type * as providers_slack_signing from "../providers/slack/signing.js";
import type * as providers_slack_users from "../providers/slack/users.js";
import type * as scheduling_cron from "../scheduling/cron.js";
import type * as scheduling_data from "../scheduling/data.js";
import type * as scheduling_mcp from "../scheduling/mcp.js";
import type * as scheduling_schedules from "../scheduling/schedules.js";
import type * as scheduling_timing from "../scheduling/timing.js";
import type * as shared_actor from "../shared/actor.js";
import type * as skills_access from "../skills/access.js";
import type * as skills_catalog from "../skills/catalog.js";
import type * as skills_data from "../skills/data.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "approvals/approvals": typeof approvals_approvals;
  "approvals/console": typeof approvals_console;
  "approvals/runtime": typeof approvals_runtime;
  "attention/activations": typeof attention_activations;
  "broker/approval/args": typeof broker_approval_args;
  "broker/approvals": typeof broker_approvals;
  "broker/mcp": typeof broker_mcp;
  "broker/providers": typeof broker_providers;
  "broker/providers/common": typeof broker_providers_common;
  "broker/providers/github/format": typeof broker_providers_github_format;
  "broker/providers/github/index": typeof broker_providers_github_index;
  "broker/providers/google/format": typeof broker_providers_google_format;
  "broker/providers/google/gmail": typeof broker_providers_google_gmail;
  "broker/providers/google/index": typeof broker_providers_google_index;
  "broker/providers/google/request": typeof broker_providers_google_request;
  "broker/providers/linear": typeof broker_providers_linear;
  "broker/providers/microsoft": typeof broker_providers_microsoft;
  "broker/providers/notion": typeof broker_providers_notion;
  "broker/providers/slack": typeof broker_providers_slack;
  "executions/approval": typeof executions_approval;
  "executions/approvals": typeof executions_approvals;
  "executions/artifacts": typeof executions_artifacts;
  "executions/bundles": typeof executions_bundles;
  "executions/codex": typeof executions_codex;
  "executions/continuation": typeof executions_continuation;
  "executions/control": typeof executions_control;
  "executions/data": typeof executions_data;
  "executions/execute": typeof executions_execute;
  "executions/instructions": typeof executions_instructions;
  "executions/integrations": typeof executions_integrations;
  "executions/labels": typeof executions_labels;
  "executions/list": typeof executions_list;
  "executions/monitor": typeof executions_monitor;
  "executions/pending": typeof executions_pending;
  "executions/prompt": typeof executions_prompt;
  "executions/records": typeof executions_records;
  "executions/runtime": typeof executions_runtime;
  "executions/sandbox/e2b": typeof executions_sandbox_e2b;
  "executions/sandbox/harness": typeof executions_sandbox_harness;
  "executions/sandbox/preflights": typeof executions_sandbox_preflights;
  "executions/skills": typeof executions_skills;
  "executions/summaries": typeof executions_summaries;
  "executions/targets": typeof executions_targets;
  "executions/tokens": typeof executions_tokens;
  "executions/tools/adapter": typeof executions_tools_adapter;
  "executions/tools/assemble": typeof executions_tools_assemble;
  "executions/tools/definitions": typeof executions_tools_definitions;
  "executions/tools/github/bundle": typeof executions_tools_github_bundle;
  "executions/tools/github/index": typeof executions_tools_github_index;
  "executions/tools/github/preflight": typeof executions_tools_github_preflight;
  "executions/tools/google/bundle": typeof executions_tools_google_bundle;
  "executions/tools/google/index": typeof executions_tools_google_index;
  "executions/tools/google/preflight": typeof executions_tools_google_preflight;
  "executions/tools/index": typeof executions_tools_index;
  "executions/tools/linear/bundle": typeof executions_tools_linear_bundle;
  "executions/tools/linear/index": typeof executions_tools_linear_index;
  "executions/tools/linear/preflight": typeof executions_tools_linear_preflight;
  "executions/tools/microsoft/bundle": typeof executions_tools_microsoft_bundle;
  "executions/tools/microsoft/index": typeof executions_tools_microsoft_index;
  "executions/tools/microsoft/preflight": typeof executions_tools_microsoft_preflight;
  "executions/tools/milo/bundle": typeof executions_tools_milo_bundle;
  "executions/tools/milo/index": typeof executions_tools_milo_index;
  "executions/tools/milo/script": typeof executions_tools_milo_script;
  "executions/tools/notion/bundle": typeof executions_tools_notion_bundle;
  "executions/tools/notion/index": typeof executions_tools_notion_index;
  "executions/tools/notion/preflight": typeof executions_tools_notion_preflight;
  "executions/tools/policy": typeof executions_tools_policy;
  "executions/tools/resolve": typeof executions_tools_resolve;
  "executions/tools/schemas/common": typeof executions_tools_schemas_common;
  "executions/tools/schemas/github": typeof executions_tools_schemas_github;
  "executions/tools/schemas/google": typeof executions_tools_schemas_google;
  "executions/tools/schemas/index": typeof executions_tools_schemas_index;
  "executions/tools/schemas/linear": typeof executions_tools_schemas_linear;
  "executions/tools/schemas/microsoft": typeof executions_tools_schemas_microsoft;
  "executions/tools/schemas/milo": typeof executions_tools_schemas_milo;
  "executions/tools/schemas/notion": typeof executions_tools_schemas_notion;
  "executions/tools/schemas/slack": typeof executions_tools_schemas_slack;
  "executions/tools/slack/bundle": typeof executions_tools_slack_bundle;
  "executions/tools/slack/index": typeof executions_tools_slack_index;
  "executions/tools/slack/preflight": typeof executions_tools_slack_preflight;
  "executions/tools/types": typeof executions_tools_types;
  "executions/trace": typeof executions_trace;
  "executions/triggers": typeof executions_triggers;
  http: typeof http;
  "identity/clerk": typeof identity_clerk;
  "identity/clerkData": typeof identity_clerkData;
  "identity/clerkProfile": typeof identity_clerkProfile;
  "identity/identities": typeof identity_identities;
  "identity/organization": typeof identity_organization;
  "identity/users": typeof identity_users;
  "integrations/data": typeof integrations_data;
  "integrations/disconnect": typeof integrations_disconnect;
  "integrations/revoke": typeof integrations_revoke;
  "integrations/status": typeof integrations_status;
  "maintenance/truncate": typeof maintenance_truncate;
  "messages/ingest": typeof messages_ingest;
  "openrouter/client": typeof openrouter_client;
  "openrouter/index": typeof openrouter_index;
  "permissions/catalog": typeof permissions_catalog;
  "permissions/data": typeof permissions_data;
  "permissions/github": typeof permissions_github;
  "permissions/notion": typeof permissions_notion;
  "permissions/tools": typeof permissions_tools;
  "prompts/generated": typeof prompts_generated;
  "prompts/render": typeof prompts_render;
  "prompts/time": typeof prompts_time;
  "providers/catalog": typeof providers_catalog;
  "providers/credentials": typeof providers_credentials;
  "providers/data": typeof providers_data;
  "providers/github/app": typeof providers_github_app;
  "providers/github/config": typeof providers_github_config;
  "providers/github/credentials": typeof providers_github_credentials;
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
  "providers/notion/config": typeof providers_notion_config;
  "providers/notion/credentials": typeof providers_notion_credentials;
  "providers/notion/data": typeof providers_notion_data;
  "providers/notion/http": typeof providers_notion_http;
  "providers/notion/install": typeof providers_notion_install;
  "providers/notion/oauth": typeof providers_notion_oauth;
  "providers/notion/signing": typeof providers_notion_signing;
  "providers/oauth": typeof providers_oauth;
  "providers/signing": typeof providers_signing;
  "providers/slack/approval/blocks": typeof providers_slack_approval_blocks;
  "providers/slack/approval/cards": typeof providers_slack_approval_cards;
  "providers/slack/approval/labels": typeof providers_slack_approval_labels;
  "providers/slack/approvals": typeof providers_slack_approvals;
  "providers/slack/config": typeof providers_slack_config;
  "providers/slack/credentials": typeof providers_slack_credentials;
  "providers/slack/data": typeof providers_slack_data;
  "providers/slack/events": typeof providers_slack_events;
  "providers/slack/gate": typeof providers_slack_gate;
  "providers/slack/http": typeof providers_slack_http;
  "providers/slack/install": typeof providers_slack_install;
  "providers/slack/signing": typeof providers_slack_signing;
  "providers/slack/users": typeof providers_slack_users;
  "scheduling/cron": typeof scheduling_cron;
  "scheduling/data": typeof scheduling_data;
  "scheduling/mcp": typeof scheduling_mcp;
  "scheduling/schedules": typeof scheduling_schedules;
  "scheduling/timing": typeof scheduling_timing;
  "shared/actor": typeof shared_actor;
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

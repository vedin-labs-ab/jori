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
import type * as providers_slack_events from "../providers/slack/events.js";
import type * as providers_slack_gate from "../providers/slack/gate.js";
import type * as providers_slack_install from "../providers/slack/install.js";
import type * as providers_slack_reply from "../providers/slack/reply.js";
import type * as providers_slack_signing from "../providers/slack/signing.js";
import type * as runs_executions from "../runs/executions.js";
import type * as runs_runtime from "../runs/runtime.js";

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
  "providers/slack/events": typeof providers_slack_events;
  "providers/slack/gate": typeof providers_slack_gate;
  "providers/slack/install": typeof providers_slack_install;
  "providers/slack/reply": typeof providers_slack_reply;
  "providers/slack/signing": typeof providers_slack_signing;
  "runs/executions": typeof runs_executions;
  "runs/runtime": typeof runs_runtime;
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

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as executions from "../executions.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as onboarding from "../onboarding.js";
import type * as runtime from "../runtime.js";
import type * as slack from "../slack.js";
import type * as slackEvents from "../slackEvents.js";
import type * as slackGate from "../slackGate.js";
import type * as slackShared from "../slackShared.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  executions: typeof executions;
  http: typeof http;
  integrations: typeof integrations;
  onboarding: typeof onboarding;
  runtime: typeof runtime;
  slack: typeof slack;
  slackEvents: typeof slackEvents;
  slackGate: typeof slackGate;
  slackShared: typeof slackShared;
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

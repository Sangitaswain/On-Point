/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as boards from "../boards.js";
import type * as cards from "../cards.js";
import type * as columns from "../columns.js";
import type * as comments from "../comments.js";
import type * as lib_activityLog from "../lib/activityLog.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_orderIndex from "../lib/orderIndex.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  boards: typeof boards;
  cards: typeof cards;
  columns: typeof columns;
  comments: typeof comments;
  "lib/activityLog": typeof lib_activityLog;
  "lib/auth": typeof lib_auth;
  "lib/notifications": typeof lib_notifications;
  "lib/orderIndex": typeof lib_orderIndex;
  "lib/permissions": typeof lib_permissions;
  users: typeof users;
  workspaces: typeof workspaces;
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

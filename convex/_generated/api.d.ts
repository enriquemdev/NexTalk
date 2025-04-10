/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as captions from "../captions.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as reactions from "../reactions.js";
import type * as recordings from "../recordings.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";
import type * as webrtc from "../webrtc.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  captions: typeof captions;
  messages: typeof messages;
  notifications: typeof notifications;
  reactions: typeof reactions;
  recordings: typeof recordings;
  rooms: typeof rooms;
  users: typeof users;
  webrtc: typeof webrtc;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

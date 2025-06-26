

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as exams from "../exams.js";
import type * as forum from "../forum.js";
import type * as http from "../http.js";
import type * as matching from "../matching.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as ratings from "../ratings.js";
import type * as resources from "../resources.js";
import type * as router from "../router.js";
import type * as users from "../users.js";


declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  exams: typeof exams;
  forum: typeof forum;
  http: typeof http;
  matching: typeof matching;
  messages: typeof messages;
  notifications: typeof notifications;
  ratings: typeof ratings;
  resources: typeof resources;
  router: typeof router;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

// Use current origin so OAuth redirects work for both localhost and Vercel preview
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // SSR fallback
  return import.meta.env.VITE_AUTH_URL || "http://localhost:3000";
};

const rawAuthClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [convexClient()],
});

export const authClient = new Proxy(rawAuthClient, {
  get(target, prop, receiver) {
    if (
      prop === "displayName" ||
      prop === "name" ||
      prop === "toString" ||
      prop === "valueOf"
    ) {
      if (import.meta.env.DEV) {
        // Helps identify who is introspecting the client proxy.
        console.warn(
          "[authClient] Ignored proxy access:",
          String(prop),
          new Error().stack,
        );
      }
      if (prop === "toString") {
        return Object.prototype.toString.bind(target);
      }
      if (prop === "valueOf") {
        return Object.prototype.valueOf.bind(target);
      }
      return undefined;
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof rawAuthClient;


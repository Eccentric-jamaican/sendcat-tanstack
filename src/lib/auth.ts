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

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [convexClient()],
});


import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://dummy-url.convex.cloud";
export const convex = new ConvexReactClient(convexUrl);

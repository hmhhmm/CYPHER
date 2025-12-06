import { ConvexProvider, ConvexReactClient } from "convex/react";

// Initialize Convex client
// The URL will be set via environment variable when Convex is configured
const convexUrl = import.meta.env.VITE_CONVEX_URL;

// Create client only if URL is configured
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * Convex Provider wrapper component
 * Provides Convex context to the app when configured
 */
export function CypherConvexProvider({ children }) {
  // If Convex is not configured, render children without provider
  if (!convex) {
    console.warn('Convex URL not configured. Running in demo mode.');
    return children;
  }
  
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}

/**
 * Hook to check if Convex is configured
 */
export function useConvexConfigured() {
  return !!convex;
}

export { convex };


"use client";

import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";

export function DebugConvex() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Catch and display any console errors
    const originalError = console.error;
    console.error = function() {
      const args = Array.from(arguments);
      setError(args.join(' '));
      originalError.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <div className="p-4 m-4 border rounded bg-muted">
      <h2 className="text-xl font-bold mb-2">Convex Debug</h2>
      <p>Auth Status: {isLoading ? "Loading..." : isAuthenticated ? "Authenticated" : "Not Authenticated"}</p>
      {error && (
        <div className="mt-2 p-2 bg-destructive text-white rounded">
          <p className="font-bold">Error:</p>
          <pre className="text-xs overflow-auto max-h-48">{error}</pre>
        </div>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        If you're seeing authentication errors, make sure:
        <ol className="list-decimal pl-5 mt-1">
          <li>You've created a "convex" JWT template in Clerk</li>
          <li>The auth.js file has the correct Clerk domain</li>
          <li>You've configured convex.json correctly</li>
          <li>The Convex dev server is running (npx convex dev)</li>
        </ol>
      </p>
    </div>
  );
} 
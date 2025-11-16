/**
 * React hook for using the Athena Engine API
 *
 * Usage:
 *   const api = useAthenaApi();
 *   const agents = await api.agents.list();
 */

"use client";

import { useMemo } from "react";
import { useUser } from "@stackframe/stack";
import { createAthenaApi } from "@/lib/api/client";

export function useAthenaApi() {
  const user = useUser();

  const api = useMemo(() => {
    if (!user?.id) {
      throw new Error("User not authenticated. Please log in to use the API.");
    }
    return createAthenaApi(user.id);
  }, [user?.id]);

  return api;
}

export default useAthenaApi;

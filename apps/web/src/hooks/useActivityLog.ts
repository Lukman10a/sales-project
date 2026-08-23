"use client";

import { useQuery } from "@tanstack/react-query";
import { teamActivityApi } from "@/lib/api/teamActivity";
import { toActivityLog } from "@/lib/adapters/activity.adapter";

export function useActivityLog(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["team-activity", page, limit],
    queryFn: async () => {
      const res = await teamActivityApi.getActivity(page, limit);
      return {
        ...res,
        data: res.data.map(toActivityLog),
      };
    },
  });
}

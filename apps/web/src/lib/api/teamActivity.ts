import { api } from "./client";
import type { ApiEnvelope } from "./types";
import type { BackendActivityLog } from "../adapters/activity.adapter";

export const teamActivityApi = {
  getActivity: (page = 1, limit = 20) =>
    api.get<ApiEnvelope<BackendActivityLog[]>>(
      `/team/activity?page=${page}&limit=${limit}`,
    ),
};

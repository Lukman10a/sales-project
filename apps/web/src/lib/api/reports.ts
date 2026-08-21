import { api } from "./client";
import type { CreateReportInput, Report, ReportListResponse } from "@/types/reportTypes";

export const reportsApi = {
  list: (page: number, limit: number) =>
    api.get<ReportListResponse>(`/reports?page=${page}&limit=${limit}`),
  get: (id: string) => api.get<Report>(`/reports/${id}`),
  create: (input: CreateReportInput) =>
    api.post<Report>("/reports", input),
  remove: (id: string) => api.delete<void>(`/reports/${id}`),
};
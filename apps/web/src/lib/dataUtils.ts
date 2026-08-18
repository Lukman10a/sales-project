export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "in-progress":
      return "bg-primary/10 text-primary border-primary/20";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "scheduled":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-destructive text-destructive-foreground";
    case "high":
      return "bg-destructive/80 text-destructive-foreground";
    case "medium":
      return "bg-warning text-warning-foreground";
    case "low":
      return "bg-primary/60 text-primary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const formatFileSize = (sizeInMB: number) => {
  if (sizeInMB >= 1000) {
    return `${(sizeInMB / 1000).toFixed(2)} GB`;
  }
  return `${sizeInMB.toFixed(2)} MB`;
};

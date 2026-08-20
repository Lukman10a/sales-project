import { toast } from "@/components/ui/sonner";

/**
 * Surfaces a failed mutation with the backend-provided message when one is
 * available. `ApiError` extends `Error`, so a single `instanceof Error` check
 * covers every failure the API client throws.
 */
export function toastMutationError(error: unknown): void {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong. Please try again.";
  toast.error(message);
}
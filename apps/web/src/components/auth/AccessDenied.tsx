import React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  message?: string;
  requiredPermission?: string;
}

/**
 * Component displayed when user lacks permission to access a page or feature
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = "You don't have permission to access this page",
  requiredPermission,
}) => {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="shadow-sm max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-500/10 p-4">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>

        <p className="text-gray-400 mb-6">{message}</p>

        {requiredPermission && (
          <p className="text-sm text-gray-500 mb-6">
            Required permission:{" "}
            <span className="text-white font-mono">{requiredPermission}</span>
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};




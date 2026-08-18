import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// This file is kept for backward compatibility but is not used in the Next.js app
// All routing is handled by the App Router in src/app/

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <div>App component (not used in Next.js routing)</div>
  </TooltipProvider>
);

export default App;



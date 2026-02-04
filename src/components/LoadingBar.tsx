"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingBar() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Debounce the bar so quick navigations don't show it at all.
    setIsLoading(false);
    showTimerRef.current = setTimeout(() => {
      setIsLoading(true);
      hideTimerRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 350);
    }, 200);

    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-accent z-[9999] origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      )}
    </AnimatePresence>
  );
}

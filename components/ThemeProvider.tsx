"use client";

import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force dark mode
    document.documentElement.classList.add("dark");
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <>
      {children}
    </>
  );
}

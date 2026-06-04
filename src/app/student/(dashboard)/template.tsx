"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function StudentTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Determine if we are exactly on the student dashboard page
    const isDashboard = pathname === "/student";
    
    // Find all notifications buttons (mobile and desktop)
    const buttons = document.querySelectorAll("#notifications-btn");
    
    buttons.forEach((btn) => {
      const parent = btn.parentElement;
      if (parent) {
        if (isDashboard) {
          parent.style.setProperty("display", "", "important");
        } else {
          parent.style.setProperty("display", "none", "important");
        }
      }
    });
  }, [pathname]);

  return <>{children}</>;
}

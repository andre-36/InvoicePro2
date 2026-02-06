import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";

interface UnsavedChangesGuardOptions {
  isDirty: () => boolean;
  isSubmitting?: boolean;
}

export function useUnsavedChangesGuard({
  isDirty,
  isSubmitting = false,
}: UnsavedChangesGuardOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const isDirtyRef = useRef(isDirty);
  const isSubmittingRef = useRef(isSubmitting);

  isDirtyRef.current = isDirty;
  isSubmittingRef.current = isSubmitting;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current() && !isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isSubmittingRef.current || !isDirtyRef.current()) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;

      if (anchor.closest("[data-no-guard]")) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
      setShowDialog(true);
    };

    const handlePopState = () => {
      if (isSubmittingRef.current || !isDirtyRef.current()) return;
      window.history.pushState(null, "", window.location.pathname);
      setPendingNavigation("__back__");
      setShowDialog(true);
    };

    window.history.pushState(null, "", window.location.pathname);

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    const target = pendingNavigation;
    setPendingNavigation(null);
    setTimeout(() => {
      if (target === "__back__") {
        window.history.back();
      } else if (target) {
        navigate(target);
      }
    }, 0);
  }, [pendingNavigation, navigate]);

  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return { showDialog, confirmNavigation, cancelNavigation };
}

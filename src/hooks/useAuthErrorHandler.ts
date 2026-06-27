import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function getErrorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message ?? "");
  return "Something went wrong";
}

export function isAuthSessionError(error: unknown) {
  const message = getErrorMessage(error);
  return /unauthorized|invalid token|jwt|no authorization|no token|auth session/i.test(message);
}

export function useAuthErrorHandler(error: unknown) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!error || !isAuthSessionError(error) || handledRef.current) return;
    handledRef.current = true;

    void (async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.error("Your session expired. Please sign in again.");
      navigate({ to: "/auth", replace: true });
    })();
  }, [error, navigate, queryClient]);
}
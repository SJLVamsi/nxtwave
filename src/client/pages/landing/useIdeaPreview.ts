import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Branch, Interest } from "../../../shared/constants";
import type { IdeaCard } from "../../../shared/contracts";
import { ApiError, fetchIdea } from "./api";
import { trackEvent } from "./analytics";

export type Variant = 0 | 1 | 2;

export interface IdeaPreviewState {
  branch: Branch | null;
  interest: Interest | null;
  variant: Variant;
  idea: IdeaCard | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
  isExample: boolean;
  selectBranch: (branch: Branch) => void;
  selectInterest: (interest: Interest) => void;
  showAnother: () => void;
  retry: () => void;
}

/**
 * `example: true` fetches one canned combination immediately so the hero shows
 * a real project card before the visitor picks anything (it is labelled as an
 * example and never counted as an `idea_generated` event).
 */
export function useIdeaPreview(options?: { example?: boolean }): IdeaPreviewState {
  const example = options?.example === true;
  const [branch, setBranch] = useState<Branch | null>(example ? "CSE/IT/AI-ML" : null);
  const [interest, setInterest] = useState<Interest | null>(example ? "placements" : null);
  const [variant, setVariant] = useState<Variant>(0);
  const ready = branch !== null && interest !== null;

  const query = useQuery({
    queryKey: ["idea", branch, interest, variant],
    queryFn: ({ signal }) =>
      fetchIdea({ branch: branch as Branch, interest: interest as Interest, variant }, signal),
    enabled: ready,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const trackedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (example) return;
    const idea = query.data;
    if (!idea) return;
    const trackedKey = `${idea.key}:${idea.variant}`;
    if (trackedKeyRef.current === trackedKey) return;
    trackedKeyRef.current = trackedKey;
    trackEvent("idea_generated", {
      branch: idea.branch,
      interest: idea.interest,
      variant: idea.variant,
      source: idea.source,
    });
  }, [query.data, example]);

  const error = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "The idea writer is busy right now."
    : null;

  function reset() {
    setVariant(0);
  }

  return {
    branch,
    interest,
    variant,
    idea: query.data ?? null,
    loading: ready && query.isFetching,
    error,
    ready,
    isExample: example,
    selectBranch: (next) => {
      setBranch(next);
      reset();
    },
    selectInterest: (next) => {
      setInterest(next);
      reset();
    },
    showAnother: () => setVariant((current) => ((current + 1) % 3) as Variant),
    retry: () => {
      void query.refetch();
    },
  };
}

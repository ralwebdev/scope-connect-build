import { useEffect, useMemo, useState } from "react";
import { BASE } from "@/lib/api/client";

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function imageSrcCandidates(src?: string) {
  if (!src) return [];
  if (src.startsWith("/api/")) {
    return unique([src, `${BASE}${src}`]);
  }
  if (BASE && src.startsWith(BASE)) {
    return unique([src, src.slice(BASE.length) || "/"]);
  }
  return [src];
}

export function useImageSrc(src?: string) {
  const candidates = useMemo(() => imageSrcCandidates(src), [src]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  useEffect(() => {
    console.debug("[scope] useImageSrc:init", {
      originalSrc: src || null,
      candidates,
    });
  }, [src, candidates]);

  useEffect(() => {
    if (!candidates[index]) return;
    console.debug("[scope] useImageSrc:active", {
      originalSrc: src || null,
      activeSrc: candidates[index],
      index,
      candidates,
    });
  }, [src, index, candidates]);

  return {
    src: candidates[index],
    hasImage: index < candidates.length,
    onError: () => {
      console.warn("[scope] useImageSrc:error", {
        originalSrc: src || null,
        failedSrc: candidates[index] || null,
        nextSrc: candidates[index + 1] || null,
        index,
        candidates,
      });
      setIndex((current) => (current + 1 <= candidates.length ? current + 1 : current));
    },
  };
}

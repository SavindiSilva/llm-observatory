import { useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../lib/api";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic data-fetching hook shared by every page for consistent
 * loading/error/data handling. Deps are forwarded to useEffect, so this
 * intentionally sits outside the React Compiler's static-deps assumptions
 * (a fresh fetcher closure is expected on every render).
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: this hook IS the data-fetching primitive
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: getErrorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const refetch = () => setVersion((v) => v + 1);

  return { ...state, refetch };
}

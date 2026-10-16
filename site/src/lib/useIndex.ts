import { useCallback, useEffect, useState } from 'react';
import { m } from '../i18n';
import { buildCatalog, EMPTY_CATALOG } from './catalog';
import type { Catalog, IndexJson } from './types';

export type IndexState =
  | { status: 'loading'; catalog: Catalog }
  | { status: 'error'; catalog: Catalog; message: string }
  | { status: 'ready'; catalog: Catalog };

/** Loads index.json, generated at build time from the repo. This is the only source of catalog data. */
export function useIndex(): [IndexState, () => void] {
  const [state, setState] = useState<IndexState>({ status: 'loading', catalog: EMPTY_CATALOG });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading', catalog: EMPTY_CATALOG });
    fetch(`${import.meta.env.BASE_URL}index.json`, { signal: ctrl.signal, cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(m.errors.http(res.status));
        return res.json() as Promise<IndexJson>;
      })
      .then((index) => {
        if (index.schemaVersion !== 1) throw new Error(m.errors.schema(index.schemaVersion));
        setState({ status: 'ready', catalog: buildCatalog(index) });
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setState({ status: 'error', catalog: EMPTY_CATALOG, message: e.message });
      });
    return () => ctrl.abort();
  }, [attempt]);

  return [state, useCallback(() => setAttempt((n) => n + 1), [])];
}

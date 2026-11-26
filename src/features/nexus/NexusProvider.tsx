import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { resolveNexus, type NexusSettings } from './settings';
import { loadRaw, saveRaw } from './storage';

const KEY = 'nexus.settings';

interface Ctx {
  nx: NexusSettings;
  /** Dakikada bir güncellenen saat (güneşe göre ışık geçişi için) */
  now: number;
  update: (patch: Partial<NexusSettings>) => void;
}

const NexusContext = createContext<Ctx | null>(null);

function initial(): NexusSettings {
  const raw = loadRaw(KEY);
  try {
    return resolveNexus(raw ? JSON.parse(raw) : null);
  } catch {
    return resolveNexus(null);
  }
}

/** Uygulama ayarları: açılışta bir kez okunur, her değişiklikte kaydedilir */
export function NexusProvider({ children }: { children: ReactNode }) {
  const [nx, setNx] = useState<NexusSettings>(initial);
  const update = useCallback((patch: Partial<NexusSettings>) => {
    setNx((cur) => {
      const next = resolveNexus({ ...cur, ...patch });
      saveRaw(KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  return <NexusContext.Provider value={{ nx, update, now }}>{children}</NexusContext.Provider>;
}

export function useNexusSettings(): Ctx {
  const c = useContext(NexusContext);
  if (!c) throw new Error('NexusProvider eksik');
  return c;
}

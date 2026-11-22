import Storage from 'expo-sqlite/kv-store';

/** Telefon: ayarlar cihazdaki küçük anahtar-değer deposunda (expo-sqlite/kv-store) */
export function loadRaw(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

export function saveRaw(key: string, value: string): void {
  Storage.setItemAsync(key, value).catch(() => {});
}

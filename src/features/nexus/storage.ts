/** Web: ayarlar tarayıcının yerel deposunda */
export function loadRaw(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // depolama kapalıysa ayarlar yalnızca bu oturumda geçerli
  }
}

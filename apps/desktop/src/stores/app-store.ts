import { create } from 'zustand';
import type { ReceiptRecord } from '../types/receipt';
import type { Locale } from '../i18n';
import { setLocale as setI18nLocale } from '../i18n';

const LOCALE_KEY = 'receipt:locale';
function getInitialLocale(): Locale {
  try {
    const s = localStorage.getItem(LOCALE_KEY);
    if (s === 'zh' || s === 'en' || s === 'ja') return s;
  } catch {
    // ignore
  }
  return 'zh';
}
const initialLocale = getInitialLocale();
setI18nLocale(initialLocale);

interface AppState {
  directoryList: string[];
  currentDir: string | null;
  receipts: ReceiptRecord[];
  otherFiles: { fileName: string; filePath: string }[];
  loading: boolean;
  error: string | null;
  addDirectory: (dir: string) => void;
  removeDirectory: (dir: string) => void;
  setDirectoryListOrder: (ordered: string[]) => void;
  replaceDirectoryPath: (originalPath: string, newPath: string) => void;
  setCurrentDir: (dir: string | null) => void;
  setFolderData: (
    receipts: ReceiptRecord[],
    otherFiles: { fileName: string; filePath: string }[]
  ) => void;
  clearFolderData: () => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  resetOnDirChange: () => void;
  restoreDirectories: (dirs: string[], currentDir: string | null) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>((set) => ({
  directoryList: [],
  currentDir: null,
  receipts: [],
  otherFiles: [],
  loading: false,
  error: null,
  locale: initialLocale,

  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // ignore
    }
    setI18nLocale(locale);
    set({ locale });
  },

  addDirectory: (dir) =>
    set((s) => {
      const normalized = dir.replace(/[/\\]+$/, '');
      if (s.directoryList.some((d) => d === normalized)) return s;
      return { directoryList: [...s.directoryList, normalized] };
    }),

  removeDirectory: (dir) =>
    set((s) => {
      const normalized = dir.replace(/[/\\]+$/, '');
      const next = s.directoryList.filter((d) => d !== normalized);
      const nextCurrent = s.currentDir === normalized ? (next[0] ?? null) : s.currentDir;
      const cleared = nextCurrent !== s.currentDir;
      return {
        directoryList: next,
        currentDir: nextCurrent,
        receipts: cleared ? [] : s.receipts,
        otherFiles: cleared ? [] : s.otherFiles,
        error: null,
      };
    }),

  setDirectoryListOrder: (ordered) => set({ directoryList: ordered }),

  replaceDirectoryPath: (originalPath, newPath) =>
    set((s) => {
      const norm = (p: string) => p.replace(/[/\\]+$/, '');
      const from = norm(originalPath);
      const to = norm(newPath);
      const idx = s.directoryList.findIndex((d) => norm(d) === from);
      if (idx < 0) return s;
      const next = [...s.directoryList];
      next[idx] = to;
      const currentMatch = s.currentDir ? norm(s.currentDir) === from : false;
      return {
        directoryList: next,
        currentDir: currentMatch ? to : s.currentDir,
      };
    }),

  setCurrentDir: (dir) =>
    set({
      currentDir: dir,
      receipts: [],
      otherFiles: [],
      error: null,
    }),

  setFolderData: (receipts, otherFiles) => set({ receipts, otherFiles }),

  clearFolderData: () => set({ receipts: [], otherFiles: [] }),

  setLoading: (v) => set({ loading: v }),

  setError: (msg) => set({ error: msg }),

  resetOnDirChange: () =>
    set({
      receipts: [],
      otherFiles: [],
      error: null,
    }),

  restoreDirectories: (dirs, currentDir) => set({ directoryList: dirs, currentDir }),
}));

const PERSIST_KEY = 'receipt:directories';

function persistDirectories(state: { directoryList: string[]; currentDir: string | null }) {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ directoryList: state.directoryList, currentDir: state.currentDir })
    );
  } catch {
    // ignore
  }
}

export function getPersistedDirectories(): { directoryList: string[]; currentDir: string | null } | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { directoryList?: string[]; currentDir?: string | null };
    if (!Array.isArray(data.directoryList)) return null;
    return {
      directoryList: data.directoryList,
      currentDir: data.currentDir ?? null,
    };
  } catch {
    return null;
  }
}

let lastPersisted: string | null = null;
useAppStore.subscribe((state) => {
  const payload = { directoryList: state.directoryList, currentDir: state.currentDir };
  const key = JSON.stringify(payload);
  if (key !== lastPersisted) {
    lastPersisted = key;
    persistDirectories(payload);
  }
});

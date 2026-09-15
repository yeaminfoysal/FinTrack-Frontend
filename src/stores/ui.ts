/**
 * Transient UI feedback shared across screens: a snackbar toast (with an optional
 * undo-style action) and a confirm dialog. Both render in-app, so they also work on
 * web where Alert.alert does nothing.
 */
import { create } from 'zustand';

export interface ToastOptions {
  message: string;
  /** Optional action button, e.g. "ফিরিয়ে নিন" (undo). */
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
  durationMs?: number;
}

export interface Toast extends ToastOptions {
  id: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface ConfirmDialog extends ConfirmOptions {
  id: number;
  resolve: (confirmed: boolean) => void;
}

interface UiState {
  toast: Toast | null;
  dialog: ConfirmDialog | null;
  showToast: (toast: ToastOptions) => void;
  hideToast: (id: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  closeDialog: (confirmed: boolean) => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set, get) => ({
  toast: null,
  dialog: null,

  showToast: (toast) => set({ toast: { ...toast, id: nextId++ } }),

  hideToast: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      // A new question replaces one that was never answered.
      get().dialog?.resolve(false);
      set({ dialog: { ...options, id: nextId++, resolve } });
    }),

  closeDialog: (confirmed) => {
    const dialog = get().dialog;
    if (!dialog) return;
    set({ dialog: null });
    dialog.resolve(confirmed);
  },
}));

export const showToast = (toast: ToastOptions) => useUiStore.getState().showToast(toast);
export const confirmDialog = (options: ConfirmOptions) => useUiStore.getState().confirm(options);

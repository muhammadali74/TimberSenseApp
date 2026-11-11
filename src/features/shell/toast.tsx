/**
 * WS-G. Minimal toast system. Any workstream may call `toast('…')` for stubbed actions.
 */
import {CheckCircle2, Info, TriangleAlert, X} from 'lucide-react';
import {create} from 'zustand';
import {cn} from '@/lib/cn';

type Tone = 'success' | 'info' | 'warning';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const useToasts = create<{toasts: Toast[]; dismiss: (id: number) => void}>()((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)})),
}));

let nextId = 1;
export function toast(message: string, tone: Tone = 'success', ms = 3200) {
  const id = nextId++;
  useToasts.setState((s) => ({toasts: [...s.toasts, {id, message, tone}].slice(-4)}));
  window.setTimeout(() => useToasts.getState().dismiss(id), ms);
}

const ICON = {success: CheckCircle2, info: Info, warning: TriangleAlert};

export function Toaster() {
  const {toasts, dismiss} = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <output
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-fg px-4 py-2.5 text-sm text-fg-inverse shadow-xl animate-[toast-in_180ms_ease-out]"
          >
            <Icon
              size={16}
              className={cn(
                t.tone === 'success' && 'text-[#4dd07a]',
                t.tone === 'info' && 'text-[#6c9eff]',
                t.tone === 'warning' && 'text-warning',
              )}
            />
            {t.message}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </output>
        );
      })}
    </div>
  );
}

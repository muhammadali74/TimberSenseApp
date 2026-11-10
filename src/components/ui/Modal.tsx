import {Dialog, DialogPanel, DialogTitle} from '@headlessui/react';
import {X} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

const SIZES = {sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl'};

export function Modal({open, onClose, title, size = 'md', children, footer}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className={cn('w-full rounded-2xl bg-surface shadow-2xl', SIZES[size])}>
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <DialogTitle className="text-base font-semibold text-fg">{title}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-fg-muted hover:bg-surface-hover cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

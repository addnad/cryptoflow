"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

/** Bottom-sheet style modal with dimmed backdrop and sprung entrance. */
export function Modal({ open, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "calc(100% + 40px)" }}
            animate={{ y: 0 }}
            exit={{ y: "calc(100% + 40px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="pb-safe relative mx-3 mb-0 w-full max-w-md rounded-t-3xl border border-line bg-ink-raised px-6 pt-6"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

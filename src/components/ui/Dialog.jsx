import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, scale: 0.95, y: -10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 }
};

const transition = {
  duration: 0.2,
  ease: 'easeOut'
};

export function Dialog({ isOpen, onClose, children, className = '' }) {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          
          {/* Dialog */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={transition}
            className={`relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl text-white ${className}`}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

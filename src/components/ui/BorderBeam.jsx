import { motion, AnimatePresence } from 'framer-motion';

export const BorderBeam = ({
  className = '',
  size = 50,
  duration = 8,
  colorFrom = "#4299E1",
  colorTo = "#ffffff",
  isVisible = false,
  ...props
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key="beam"
            className={`absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent ${className}`}
            style={{
              width: size,
              offsetPath: `rect(0 auto auto 0 round ${size}px)`,
              "--color-from": colorFrom,
              "--color-to": colorTo,
            }}
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            exit={{ opacity: 0 }}
            transition={{
              duration,
              ease: "linear",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

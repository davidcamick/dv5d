import { motion } from 'framer-motion';

export function AuroraText({ className = '', children, as: Component = 'span', ...props }) {
  const MotionComponent = motion(Component);

  return (
    <MotionComponent
      className={`relative font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 animate-aurora-text ${className}`}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        ease: "linear",
        repeat: Infinity,
      }}
      style={{
        backgroundSize: '300% 100%',
      }}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

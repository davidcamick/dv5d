import { MagicCard } from './MagicCard';

export function MagicButton({ 
  children, 
  className = '', 
  gradientFrom = "#4299E1",
  gradientTo = "#9F7AEA",
  ...props 
}) {
  return (
    <MagicCard
      className={`cursor-pointer ${className}`}
      gradientFrom={gradientFrom}
      gradientTo={gradientTo}
      gradientSize={150}
      {...props}
    >
      {children}
    </MagicCard>
  );
}

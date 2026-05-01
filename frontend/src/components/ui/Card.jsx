import { cn } from '../../lib/utils/cn';
import { motion } from 'framer-motion';

export function Card({ 
  children, 
  className, 
  variant = 'default', 
  animate = true, 
  delay = 0,
  ...props 
}) {
  const variants = {
    default: 'bg-white border border-sav-border/50 rounded-[2.5rem] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06)]',
    flat: 'bg-slate-50/50 backdrop-blur-sm border border-sav-border/40 rounded-[2rem] p-6',
    outline: 'bg-transparent border border-sav-border/60 rounded-[2rem] p-6',
    premium: 'bg-white border border-sav-primary/20 rounded-[2.5rem] p-6 shadow-sav-glow border-t-sav-primary/40'
  };

  const Component = animate ? motion.div : 'div';
  const animProps = animate ? {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 }
  } : {};

  return (
    <Component
      className={cn(variants[variant], className)}
      {...animProps}
      {...props}
    >
      {children}
    </Component>
  );
}

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
    default: 'bg-white/40 backdrop-blur-md border-2 border-slate-200/30 rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-6 shadow-xl shadow-slate-200/20',
    flat: 'bg-slate-50 border-2 border-slate-300 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6',
    outline: 'bg-transparent border-2 border-slate-300 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6',
    premium: 'bg-white/40 backdrop-blur-md border-2 border-slate-200/30 rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-6 shadow-xl shadow-slate-200/20 border-t-bcb-primary/50'
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


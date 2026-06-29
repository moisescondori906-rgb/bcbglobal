import { cn } from '../../lib/utils/cn';

export function Badge({ 
  children, 
  variant = 'success', 
  className, 
  icon: Icon, 
  ...props 
}) {
  const variants = {
    success: 'bg-emerald-100 text-emerald-600 border-emerald-200/50',
    warning: 'bg-amber-100 text-amber-600 border-amber-200/50',
    error: 'bg-red-100 text-red-600 border-red-200/50',
    info: 'bg-indigo-100 text-indigo-600 border-indigo-200/50',
    muted: 'bg-slate-100 text-slate-500 border-slate-200/50',
    secondary: 'bg-bcb-surface text-black border-black/[0.03]'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </div>
  );
}



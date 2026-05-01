import { cn } from '../../lib/utils/cn';

export function Badge({ 
  children, 
  variant = 'success', 
  className, 
  icon: Icon, 
  ...props 
}) {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    muted: 'bg-slate-200 text-slate-700 border-slate-300'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest',
        variants[variant],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={10} strokeWidth={3} />}
      {children}
    </div>
  );
}

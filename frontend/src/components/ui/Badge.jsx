import { cn } from '../../lib/utils/cn';

export function Badge({ 
  children, 
  variant = 'success', 
  className, 
  icon: Icon, 
  ...props 
}) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    error: 'bg-red-50 text-red-600 border-red-100',
    info: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    muted: 'bg-slate-50 text-slate-500 border-slate-200'
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

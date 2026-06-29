import { cn } from '../../lib/utils/cn';

export function Button({ 
  children, 
  variant = 'primary', 
  className, 
  loading, 
  disabled, 
  icon: Icon, 
  ...props 
}) {
  const variants = {
    primary: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-bcb-primary to-bcb-accent-hot text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-bcb-primary/30 hover:shadow-bcb-primary/40 active:translate-y-0.5 shadow-bcb-glow',
    secondary: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-slate-100 border-2 border-slate-200 text-slate-700 font-bold text-sm sm:text-base transition-all shadow-sm hover:bg-slate-200',
    ghost: 'bg-transparent hover:bg-bcb-primary/5 text-bcb-primary font-black px-4 py-2 text-sm sm:text-base',
    danger: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-bcb-error text-white shadow-lg shadow-bcb-error/30 hover:brightness-110 font-black text-sm sm:text-base'
  };

  return (
    <button
      className={cn(
        'relative overflow-hidden font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2',
        variants[variant],
        loading && 'opacity-70 pointer-events-none',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-bcb-primary/30 border-t-bcb-primary rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={20} />}
          {children}
        </>
      )}
    </button>
  );
}



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
    primary: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sav-primary to-sav-accent-hot text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-sav-primary/30 hover:shadow-sav-primary/40 active:translate-y-0.5 shadow-sav-glow',
    secondary: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white border-2 border-sav-primary/20 text-sav-primary font-bold text-sm sm:text-base transition-all shadow-sm hover:bg-sav-primary/5',
    ghost: 'bg-transparent hover:bg-sav-primary/5 text-sav-primary font-black px-4 py-2 text-sm sm:text-base',
    danger: 'h-12 sm:h-14 w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-sav-error text-white shadow-lg shadow-sav-error/30 hover:brightness-110 font-black text-sm sm:text-base'
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
        <div className="w-5 h-5 border-2 border-sav-primary/30 border-t-sav-primary rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={20} />}
          {children}
        </>
      )}
    </button>
  );
}

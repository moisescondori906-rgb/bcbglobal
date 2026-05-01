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
    primary: 'btn-primary bg-gradient-to-r from-sav-primary to-sav-accent',
    secondary: 'btn-secondary',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
    danger: 'bg-sav-error text-white shadow-lg shadow-sav-error/20 hover:brightness-110'
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

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
    primary: 'btn-primary bg-gradient-to-r from-sav-primary to-sav-accent-hot shadow-sav-glow',
    secondary: 'btn-secondary border-2 border-sav-primary/20 text-sav-primary hover:bg-sav-primary/5',
    ghost: 'bg-transparent hover:bg-sav-primary/5 text-sav-primary font-black',
    danger: 'bg-sav-error text-white shadow-lg shadow-sav-error/30 hover:brightness-110 font-black'
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

import { useState } from 'react';
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function Input({ 
  label, 
  error, 
  type = 'text', 
  icon: Icon, 
  className, 
  showPasswordToggle,
  ...props 
}) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  const finalType = isPassword && showPass ? 'text' : type;

  return (
    <div className={cn("space-y-2 w-full", className)}>
      {label && (
        <label className="flex items-center gap-2 text-[10px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-1">
          {Icon && <Icon size={12} className="text-bcb-primary" />}
          {label}
        </label>
      )}
      <div className={cn(
        "relative flex items-center transition-all duration-300",
        error ? "animate-shake" : ""
      )}>
        {Icon && (
          <div className="absolute left-6 text-slate-400">
            <Icon size={18} strokeWidth={2.5} />
          </div>
        )}
        <input
          {...props}
          type={finalType}
          className={cn(
            "w-full h-14 rounded-2xl border-2 transition-all duration-300 outline-none text-sm font-black",
            Icon ? "pl-14 pr-6" : "px-6",
            error 
              ? "border-red-500 bg-red-50/80 backdrop-blur-sm text-red-900 placeholder:text-red-300" 
              : "border-slate-100/80 bg-white/80 backdrop-blur-sm text-black placeholder:text-slate-400 focus:border-bcb-primary/30 shadow-sm",
            showPasswordToggle && "pr-14",
            className
          )}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-bcb-muted hover:text-bcb-primary transition-colors p-2"
          >
            {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-bcb-error uppercase tracking-widest ml-1 animate-in">
          {error}
        </p>
      )}
    </div>
  );
}


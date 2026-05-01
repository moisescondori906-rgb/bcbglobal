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
        <label className="flex items-center gap-2 text-[10px] font-black text-sav-muted uppercase tracking-[0.2em] ml-1">
          {Icon && <Icon size={12} className="text-sav-primary" />}
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          type={finalType}
          className={cn(
            "input-field",
            error && "border-sav-error/50 bg-sav-error/5",
            showPasswordToggle && "pr-14"
          )}
          {...props}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sav-muted hover:text-sav-primary transition-colors p-2"
          >
            {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-sav-error uppercase tracking-widest ml-1 animate-in">
          {error}
        </p>
      )}
    </div>
  );
}

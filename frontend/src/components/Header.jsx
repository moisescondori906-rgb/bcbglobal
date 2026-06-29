import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils/cn';

export default function Header({ title, rightAction, backTo, transparent = false }) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      if (window.history.state?.idx === 0) {
        navigate('/', { replace: true });
      } else {
        navigate(-1);
      }
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 flex items-center justify-between px-6 py-5 transition-all duration-500",
      transparent 
        ? "bg-transparent" 
        : "bg-white/80 backdrop-blur-2xl border-b border-black/[0.03] shadow-sm"
    )}>
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center justify-center w-11 h-11 rounded-2xl bg-bcb-surface border border-black/[0.03] text-black active:scale-90 transition-all hover:bg-white hover:shadow-m3-1"
        >
          <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
        </button>
        
        <div className="flex flex-col min-w-0">
          <h1 className="font-extrabold text-black text-[15px] sm:text-[16px] uppercase tracking-[0.1em] truncate">
            {title}
          </h1>
          <div className="h-0.5 w-6 bg-bcb-primary rounded-full mt-0.5" />
        </div>
      </div>
      
      {rightAction && (
        <div className="flex justify-end ml-4">
          {rightAction}
        </div>
      )}
    </header>
  );
}



import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
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
      "sticky top-0 z-50 flex items-center justify-between px-6 py-5 transition-all duration-300",
      transparent ? "bg-transparent" : "bg-sav-dark/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl shadow-black/50"
    )}>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center justify-center w-10 h-10 rounded-2xl bg-white/5 border border-white/5 text-sav-primary active:scale-90 transition-all hover:bg-sav-primary/20 hover:border-sav-primary/30 shadow-lg"
        >
          <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        
        <div className="flex flex-col min-w-0">
          <h1 className="font-black text-slate-900 text-sm uppercase tracking-[0.2em] truncate drop-shadow-sm">
            {title}
          </h1>
          <div className="h-0.5 w-6 bg-sav-primary/50 rounded-full mt-1" />
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

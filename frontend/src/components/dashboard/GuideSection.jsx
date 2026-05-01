import { Sparkles } from 'lucide-react';

export default function GuideSection({ text }) {
  if (!text) return null;

  return (
    <div className="relative overflow-hidden bg-sav-dark/20 backdrop-blur-xl border-y border-white/5 py-4 group">
      {/* Decorative accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sav-accent/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sav-accentHot/20 to-transparent" />
      
      <div className="flex items-center gap-8 animate-marquee-slow whitespace-nowrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4">
            <Sparkles size={12} className={i % 2 === 0 ? "text-sav-accent" : "text-sav-accentHot"} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

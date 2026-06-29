import { Sparkles } from 'lucide-react';

export default function GuideSection({ text }) {
  if (!text) return null;

  return (
    <div className="relative overflow-hidden bg-white/[0.01] border-y border-white/[0.05] py-4 group">
      <div className="flex items-center gap-8 animate-marquee-slow whitespace-nowrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4">
            <Sparkles size={12} className="text-bcb-accent" fill="currentColor" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


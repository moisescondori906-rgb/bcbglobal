import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils/cn';

export default function ActionGrid({ items }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemAnim = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="grid grid-cols-3 gap-4 sm:gap-6"
    >
      {items.map((item, idx) => {
        const { to, icon: Icon, label, badge, color, bg, className } = item;
        return (
          <motion.div key={idx} variants={itemAnim}>
            <Link
              to={to}
              className="group flex flex-col items-center gap-3.5 p-5 rounded-m3-lg border border-black/[0.03] bg-transparent transition-all duration-500 hover:shadow-m3-2 hover:-translate-y-1 active:scale-95 shadow-m3-1"
            >
              <div className={cn(
                "w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-3 shadow-sm",
                bg || "bg-bcb-surface",
                color || "text-bcb-primary"
              )}>
                <Icon size={26} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className={cn(
                  "text-[11px] font-extrabold uppercase tracking-widest text-bcb-text-dim group-hover:text-bcb-primary transition-colors text-center leading-none",
                  className
                )}>
                  {label}
                </span>
                {badge && (
                   <div className="scale-75 origin-top">
                     {badge}
                   </div>
                )}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}



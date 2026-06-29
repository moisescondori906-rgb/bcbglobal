/**
 * Componente Logo BCB Global - Usa logo.png de forma consistente
 * Variantes: header (compacto), auth (login/registro), hero (dashboard/carrusel)
 */
export default function Logo({ variant = 'header', className = '' }) {
  const base = 'object-contain';
  const variants = {
    header: 'h-9 w-auto min-w-[80px]',
    auth: 'h-20 w-auto min-w-[120px]',
    hero: 'h-24 w-auto min-w-[140px]',
  };

  return (
    <img
      src="/imag/logo.webp"
      alt="BCB Global"
      className={`${base} ${variants[variant] || variants.header} ${className}`}
    />
  );
}

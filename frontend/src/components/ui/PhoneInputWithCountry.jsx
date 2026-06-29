import React from 'react'; 
import { cn } from '../../lib/utils/cn'; 
 
const COUNTRIES = [
  { code: 'BO', dial: '+591', label: 'BO +591', flag: '🇧🇴' },
  { code: 'AR', dial: '+54', label: 'AR +54', flag: '🇦🇷' },
  { code: 'BR', dial: '+55', label: 'BR +55', flag: '🇧🇷' },
  { code: 'CL', dial: '+56', label: 'CL +56', flag: '🇨🇱' },
  { code: 'PE', dial: '+51', label: 'PE +51', flag: '🇵🇪' },
  { code: 'CO', dial: '+57', label: 'CO +57', flag: '🇨🇴' },
  { code: 'EC', dial: '+593', label: 'EC +593', flag: '🇪🇨' },
  { code: 'PY', dial: '+595', label: 'PY +595', flag: '🇵🇾' },
  { code: 'UY', dial: '+598', label: 'UY +598', flag: '🇺🇾' },
  { code: 'MX', dial: '+52', label: 'MX +52', flag: '🇲🇽' },
  { code: 'US', dial: '+1', label: 'US +1', flag: '🇺🇸' },
  { code: 'ES', dial: '+34', label: 'ES +34', flag: '🇪🇸' },
];

function cleanLocalNumber(value, dialCode) {
  let clean = String(value || '').replace(/\D/g, '');

  const dialDigits = dialCode.replace(/\D/g, '');

  if (clean.startsWith('00' + dialDigits)) {
    clean = clean.slice(('00' + dialDigits).length);
  }

  if (clean.startsWith(dialDigits)) {
    clean = clean.slice(dialDigits.length);
  }

  return clean;
}

export function PhoneInputWithCountry({
  value,
  onChange,
  error,
  placeholder = 'Número de celular',
  className,
}) {
  const [countryCode, setCountryCode] = React.useState('BO');
  const selected = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const localValue = React.useMemo(() => {
    return cleanLocalNumber(value || '', selected.dial);
  }, [value, selected.dial]);

  const emitValue = (dial, local) => {
    const cleanLocal = cleanLocalNumber(local, dial);
    onChange?.(`${dial}${cleanLocal}`);
  };

  const handleCountryChange = (e) => {
    const nextCode = e.target.value;
    const nextCountry = COUNTRIES.find((c) => c.code === nextCode) || COUNTRIES[0];

    setCountryCode(nextCode);
    emitValue(nextCountry.dial, localValue);
  };

  const handleLocalChange = (e) => {
    const cleanLocal = cleanLocalNumber(e.target.value, selected.dial);
    emitValue(selected.dial, cleanLocal);
  };

  return (
    <div className={cn('w-full', className)}> 
      <div 
        className={cn(
          'flex h-14 w-full items-center overflow-hidden rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm',
          error 
            ? 'border-red-500 bg-red-50/80'
            : 'border-slate-100/80 bg-white/80 focus-within:border-bcb-primary/30 shadow-sm'
        )}>
        <div className="relative h-full w-[100px] shrink-0">
          <select 
            value={countryCode} 
            onChange={handleCountryChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          > 
            {COUNTRIES.map((country) => ( 
              <option key={country.code} value={country.code} className="bg-white text-black"> 
                {country.flag} {country.dial} 
              </option> 
            ))} 
          </select> 
          <div className="flex h-full items-center justify-center gap-2 px-3 border-r border-slate-200/50 bg-slate-50/60">
            <span className="text-lg">{selected.flag}</span>
            <span className="text-[11px] font-black text-black">{selected.dial}</span>
          </div>
        </div>
 
        <input 
          type="tel" 
          inputMode="numeric" 
          value={localValue} 
          onChange={handleLocalChange} 
          placeholder={placeholder} 
          className="h-full w-full border-none bg-transparent px-6 text-sm font-black text-black outline-none placeholder:text-slate-400"
        />
      </div>
 
      {error && ( 
        <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-widest text-bcb-error animate-in fade-in slide-in-from-top-1"> 
          {error} 
        </p> 
      )} 
    </div> 
  ); 
} 
 
export default PhoneInputWithCountry;

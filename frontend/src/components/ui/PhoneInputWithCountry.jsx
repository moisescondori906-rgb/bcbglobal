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
          'flex w-full items-center overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
          error 
            ? 'border-red-400 bg-red-50/40'
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10'
        )}
      >
        <select 
          value={countryCode} 
          onChange={handleCountryChange} 
          className="h-14 w-[100px] shrink-0 border-0 border-r border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-900 outline-none"
        > 
          {COUNTRIES.map((country) => ( 
            <option key={country.code} value={country.code}> 
              {country.flag} {country.dial} 
            </option> 
          ))} 
        </select> 
 
        <input 
          type="tel" 
          inputMode="numeric" 
          value={localValue} 
          onChange={handleLocalChange} 
          placeholder={placeholder} 
          className="h-14 min-w-0 flex-1 border-0 bg-white px-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400" 
        /> 
      </div> 
 
      {error && ( 
        <p className="mt-1 px-1 text-[11px] font-bold uppercase tracking-wide text-red-500"> 
          {error} 
        </p> 
      )} 
    </div> 
  ); 
} 
 
export default PhoneInputWithCountry;
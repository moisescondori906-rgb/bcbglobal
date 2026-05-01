import React, { forwardRef, useState, useEffect, useImperativeHandle } from 'react';
import { cn } from '../../lib/utils/cn';
import { Smartphone, AlertCircle } from 'lucide-react';

const COUNTRIES = [
  { code: 'BO', dial_code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'AR', dial_code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', dial_code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CL', dial_code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', dial_code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: 'CO', dial_code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: 'EC', dial_code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'PY', dial_code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'UY', dial_code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'MX', dial_code: '+52', name: 'México', flag: '🇲🇽' },
  { code: 'US', dial_code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', dial_code: '+34', name: 'España', flag: '🇪🇸' },
];

export const PhoneInputWithCountry = forwardRef(({
  className,
  value, // Full phone number, e.g., "+59170000001"
  onChange, // Callback to return full phone number
  placeholder = "Número local",
  error: propError,
  ...props
}, ref) => {
  const defaultCountry = COUNTRIES.find(c => c.code === 'BO');
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [localNumber, setLocalNumber] = useState('');
  const [internalError, setInternalError] = useState('');

  useImperativeHandle(ref, () => ({
    validate: () => {
      return !internalError;
    }
  }));

  // Effect to parse the initial value prop into country code and local number
  useEffect(() => {
    if (value && typeof value === 'string') {
      let matched = false;
      for (const country of COUNTRIES) {
        if (value.startsWith(country.dial_code)) {
          setSelectedCountry(country);
          setLocalNumber(value.substring(country.dial_code.length));
          matched = true;
          break;
        }
      }
      if (!matched) {
        // If no country code matches, assume it's just a local number for the default country
        setSelectedCountry(defaultCountry);
        setLocalNumber(value);
      }
    } else {
      setSelectedCountry(defaultCountry);
      setLocalNumber('');
    }
  }, [value]);

  useEffect(() => {
    validatePhoneNumber(localNumber, selectedCountry);
    // Only call onChange if both parts are ready
    if (selectedCountry && localNumber) {
        onChange(`${selectedCountry.dial_code}${localNumber}`);
    } else if (value && !localNumber && !selectedCountry) {
        // If value was passed initially and now cleared, also clear parent state
        onChange('');
    } else if (!value && !localNumber && selectedCountry) {
        // If no initial value, but country selected and no local number, pass only dial code
        // This handles the case where the component initializes with default country but no number
        onChange('');
    }
  }, [selectedCountry, localNumber]);

  const cleanLocalNumber = (number, currentCountry) => {
    let cleaned = number.replace(/[^0-9]/g, ''); // Remove non-digits
    
    // Remove country dial code if present at the beginning
    if (currentCountry && cleaned.startsWith(currentCountry.dial_code.substring(1))) {
      cleaned = cleaned.substring(currentCountry.dial_code.substring(1).length);
    }
    
    // Remove leading zeros unless it's the only digit
    if (cleaned.length > 1 && cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
    }

    return cleaned;
  };

  const validatePhoneNumber = (number, country) => {
    let errorMsg = '';
    const cleanedNumber = cleanLocalNumber(number, country);

    if (!cleanedNumber) {
      errorMsg = 'El número local no puede estar vacío.';
    } else if (country.code === 'BO' && cleanedNumber.length !== 8) {
      errorMsg = 'Para Bolivia, el número debe tener 8 dígitos.';
    } else if (cleanedNumber.length < 6 || cleanedNumber.length > 15) { // General length validation
        errorMsg = 'Número local inválido.';
    }
    setInternalError(errorMsg);
  };

  const handleCountryChange = (event) => {
    const countryCode = event.target.value;
    const newCountry = COUNTRIES.find(c => c.dial_code === countryCode);
    setSelectedCountry(newCountry);
    validatePhoneNumber(localNumber, newCountry);
  };

  const handleLocalNumberChange = (event) => {
    const input = event.target.value;
    const cleaned = cleanLocalNumber(input, selectedCountry);
    setLocalNumber(cleaned);
    validatePhoneNumber(cleaned, selectedCountry);
  };

  const displayError = propError || internalError;

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <div className={cn(
        "flex rounded-xl border bg-white shadow-sm transition-all focus-within:border-sav-primary/50 focus-within:ring-4 focus-within:ring-sav-primary/10",
        displayError && "border-sav-error/50 bg-sav-error/5",
        "h-12 sm:h-14 w-full" // Ensure consistent height
      )}>
        <select
          value={selectedCountry?.dial_code || ''}
          onChange={handleCountryChange}
          className="flex-shrink-0 flex items-center pl-3 pr-2 bg-transparent text-slate-900 font-bold text-base outline-none cursor-pointer rounded-l-xl"
          aria-label="Seleccionar código de país"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.dial_code}>
              {country.flag} {country.dial_code}
            </option>
          ))}
        </select>
        <div className="w-[1px] h-full bg-slate-200" /> {/* Separator */}
        <input
          type="tel" // Use type="tel" for phone numbers
          value={localNumber}
          onChange={handleLocalNumberChange}
          onBlur={() => validatePhoneNumber(localNumber, selectedCountry)}
          placeholder={placeholder}
          className={cn(
            "flex-1 px-4 py-2 bg-transparent text-slate-900 placeholder:text-sav-muted text-base outline-none rounded-r-xl",
            "h-full"
          )}
          {...props}
        />
      </div>
      {displayError && (
        <p className="absolute -bottom-5 left-1 flex items-center gap-1 text-[10px] font-bold text-sav-error uppercase tracking-widest animate-in">
          <AlertCircle size={12} /> {displayError}
        </p>
      )}
    </div>
  );
});

PhoneInputWithCountry.displayName = 'PhoneInputWithCountry';

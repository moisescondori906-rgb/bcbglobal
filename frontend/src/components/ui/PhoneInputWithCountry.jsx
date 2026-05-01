import React, { forwardRef } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '../../lib/utils/cn';
import { Smartphone } from 'lucide-react';

export const PhoneInputWithCountry = forwardRef(({
  className,
  value,
  onChange,
  placeholder,
  error,
  ...props
}, ref) => {
  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Smartphone size={18} className="absolute left-4 text-sav-muted z-10" />
      <PhoneInput
        international
        defaultCountry="BO" // Default country to Bolivia (+591)
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "phone-input-custom", // Custom class for styling
          error && "border-sav-error/50 bg-sav-error/5"
        )}
        inputRef={ref}
        {...props}
      />
      {error && (
        <p className="absolute -bottom-5 left-1 text-[10px] font-bold text-sav-error uppercase tracking-widest animate-in">
          {error}
        </p>
      )}
      <style>{`
        .phone-input-custom {
          display: flex;
          align-items: center;
          width: 100%;
          height: 48px; /* Equivalent to h-12 */
          padding-left: 40px; /* Adjust padding for icon */
          padding-right: 16px;
          border-radius: 12px; /* Equivalent to rounded-xl */
          background-color: #fff; /* bg-white */
          border: 1px solid #e2e8f0; /* border-sav-border */
          color: #1e293b; /* text-slate-900 */
          font-size: 16px; /* text-base */
          transition: all 0.3s ease;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
        }

        .phone-input-custom:focus-within {
          border-color: rgba(99, 102, 241, 0.5); /* focus:border-sav-primary/50 */
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); /* focus:ring-4 focus:ring-sav-primary/10 */
          outline: none;
        }

        .phone-input-custom .PhoneInputInput {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 16px; /* text-base */
          padding: 0;
          height: 100%;
          outline: none;
        }

        .phone-input-custom .PhoneInputInput::placeholder {
          color: #64748b; /* placeholder:text-sav-muted */
        }

        .phone-input-custom .PhoneInputCountrySelect { 
          position: relative;
          z-index: 1;
          margin-right: 8px; /* gap-2 */
          border: none;
          background: transparent;
          height: 100%;
          cursor: pointer;
          font-weight: 700; /* font-bold */
          color: #1e293b; /* text-slate-900 */
        }

        .phone-input-custom .PhoneInputCountrySelectArrow {
          display: none; /* Hide default arrow */
        }

        .phone-input-custom .PhoneInputCountryIcon {
          width: 24px;
          height: 18px;
          border-radius: 2px;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        }

        /* Adjustments for sm:h-14, sm:rounded-2xl */
        @media (min-width: 640px) {
          .phone-input-custom {
            height: 56px; /* sm:h-14 */
            border-radius: 16px; /* sm:rounded-2xl */
          }
        }
      `}</style>
    </div>
  );
});

PhoneInputWithCountry.displayName = 'PhoneInputWithCountry';

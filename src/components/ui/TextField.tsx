import React, { useId } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  placeholder?: string;
  required?: boolean;
  error?: string;
  /** Shows a check next to the label once the value satisfies the field's rule. */
  isValid?: boolean;
  icon?: React.ReactNode;
  mono?: boolean;
  title?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  error,
  isValid,
  icon,
  mono = false,
  title,
}) => {
  const id = useId();

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label
          htmlFor={id}
          title={title}
          className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1"
        >
          {icon}
          {label} {required && '*'}
        </label>
        {isValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
      </div>
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
          mono ? 'font-mono font-bold' : ''
        } ${error ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'}`}
      />
      {error && <p className="text-2xs text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
};

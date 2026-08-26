import React from 'react';
import { Check, Dot } from 'lucide-react';

export const getPasswordValidationState = (password = '') => {
  const str = String(password || '');
  return {
    minLength: str.length >= 8,
    hasUppercase: /[A-Z]/.test(str),
    hasLowercase: /[a-z]/.test(str),
    hasNumber: /\d/.test(str),
    hasSpecial: /[^A-Za-z0-9]/.test(str),
  };
};

export const isPasswordStrong = (password = '') => {
  const state = getPasswordValidationState(password);
  return state.minLength && state.hasUppercase && state.hasLowercase && state.hasNumber && state.hasSpecial;
};

export default function PasswordRequirementsHelper({ password = '', isVisible = false }) {
  if (!isVisible && !password) return null;

  const state = getPasswordValidationState(password);

  const requirements = [
    { key: 'minLength', label: 'At least 8 characters', valid: state.minLength },
    { key: 'hasUppercase', label: 'One uppercase letter', valid: state.hasUppercase },
    { key: 'hasLowercase', label: 'One lowercase letter', valid: state.hasLowercase },
    { key: 'hasNumber', label: 'One number', valid: state.hasNumber },
    { key: 'hasSpecial', label: 'One special character', valid: state.hasSpecial },
  ];

  return (
    <div className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5 animate-fadeIn">
      <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
        Password must contain:
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
        {requirements.map((req) => (
          <li
            key={req.key}
            className={`flex items-center gap-1.5 transition-colors font-medium ${
              req.valid ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            {req.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <Dot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

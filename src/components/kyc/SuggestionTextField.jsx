import { useState, useRef, useEffect, useId } from 'react';

/**
 * Text input with dropdown suggestions (country / city typeahead).
 */
export default function SuggestionTextField({
  label,
  required,
  error,
  value,
  onChange,
  placeholder,
  suggestions = [],
  disabled,
  autoComplete = 'off',
  onBlur: onBlurProp,
}) {
  const err = error?.trim();
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const wrapRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    setHl(0);
  }, [suggestions.length, value]);

  const showList = open && suggestions.length > 0;

  const pick = (s) => {
    onChange(s);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHl((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHl((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestions[hl]) {
      e.preventDefault();
      pick(suggestions[hl]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-semibold text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          onBlurProp?.(e);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-xl px-4 py-3.5 text-white text-base outline-none
          focus:border-gold/50 transition-colors placeholder:text-white/45 ${err ? 'border-red-500/50' : ''}`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: err ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.09)',
        }}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl py-1 shadow-xl"
          style={{
            background: 'rgba(18,20,28,0.98)',
            border: '1px solid rgba(156,121,65,0.35)',
          }}
        >
          {suggestions.map((s, i) => (
            <li key={`${s}-${i}`} role="option" aria-selected={i === hl}>
              <button
                type="button"
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  i === hl ? 'bg-gold/20 text-gold-light' : 'text-white hover:bg-white/5'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="text-xs text-red-400 mt-1.5 font-semibold">{err}</p>}
    </div>
  );
}

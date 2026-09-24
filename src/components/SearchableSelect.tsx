import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  id: string;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string, selectedOption?: SelectOption) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  noOptionsText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  placeholder = 'Type to search...',
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  autoFocus = false,
  noOptionsText = 'No matching results found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(
    () => options.find(opt => opt.value.toLowerCase() === (value || '').toLowerCase()) || null,
    [options, value]
  );

  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else if (!value) {
      setInputValue('');
    }
  }, [selectedOption, value]);

  const filteredOptions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;

    return options
      .map(opt => {
        const l = opt.label.toLowerCase();
        const s = (opt.sublabel || '').toLowerCase();
        const b = (opt.badge || '').toLowerCase();
        let score = -1;

        if (l === q) score = 100;
        else if (l.startsWith(q)) score = 80 - (l.length - q.length);
        else if (l.includes(q)) score = 50 - l.indexOf(q);
        else if (s.startsWith(q)) score = 30;
        else if (s.includes(q) || b.includes(q)) score = 20;

        return { opt, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.opt);
  }, [options, inputValue]);

  const handleBlur = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) {
      if (value) onChange('', undefined);
      return;
    }

    const exactMatch = options.find(
      opt => opt.label.toLowerCase() === trimmed || opt.value.toLowerCase() === trimmed
    );
    if (exactMatch) {
      setInputValue(exactMatch.label);
      onChange(exactMatch.value, exactMatch);
      return;
    }

    if (selectedOption && selectedOption.label.toLowerCase() === trimmed) {
      return;
    }

    if (filteredOptions.length > 0) {
      const best = filteredOptions[0];
      setInputValue(best.label);
      onChange(best.value, best);
      return;
    }

    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else {
      setInputValue('');
      onChange('', undefined);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        handleBlur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, value, inputValue, filteredOptions, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);
    setHighlightedIndex(0);

    const q = text.trim().toLowerCase();
    if (!q) {
      onChange('', undefined);
      return;
    }

    const exact = options.find(opt => opt.label.toLowerCase() === q || opt.value.toLowerCase() === q);
    if (exact) {
      onChange(exact.value, exact);
    }
  };

  const handleSelect = (option: SelectOption) => {
    setInputValue(option.label);
    setIsOpen(false);
    onChange(option.value, option);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('', undefined);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (isOpen && filteredOptions.length > 0) {
        if (e.key === 'Enter') e.preventDefault();
        const selected = filteredOptions[highlightedIndex] || filteredOptions[0];
        if (selected) handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      }
    }
  };

  const renderHighlighted = (text: string, query: string) => {
    const q = query.trim();
    if (!q) return <span>{text}</span>;

    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <span key={i} className="bg-amber-200 text-amber-900 font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full pl-8 pr-16 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 focus:border-[#C5A059] shadow-sm transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C5A059]' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#EAE3D5] rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 text-xs divide-y divide-gray-50 animate-in fade-in-50 duration-100">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-gray-500 font-medium italic">
              {noOptionsText} {inputValue ? `for "${inputValue}"` : ''}
            </div>
          ) : (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption?.value === opt.value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#FAF7F2] text-[#8C6D33] font-bold'
                        : isHighlighted
                        ? 'bg-amber-50/60 text-gray-900'
                        : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-semibold text-gray-900">
                          {renderHighlighted(opt.label, inputValue)}
                        </span>
                        {opt.badge && (
                          <span className="px-1.5 py-0.5 text-[9.5px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span className="text-[10px] text-gray-500 truncate mt-0.5">
                          {renderHighlighted(opt.sublabel, inputValue)}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#C5A059] shrink-0 ml-2" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

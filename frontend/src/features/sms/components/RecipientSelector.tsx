import React from 'react';
import type { RecipientOption } from '../types/smsTypes';

interface RecipientSelectorProps {
  label: string;
  options: RecipientOption[];
  selected: RecipientOption[];
  onSelect: (selected: RecipientOption[]) => void;
}

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({ 
  label, 
  options, 
  selected, 
  onSelect 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <select
          multiple
          value={selected.map(opt => opt.id.toString())}
          onChange={(e) => {
            const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
            const newSelected = options.filter(opt => 
              selectedIds.includes(opt.id.toString())
            );
            onSelect(newSelected);
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md h-auto min-h-[42px]"
        >
          {options.map(option => (
            <option 
              key={option.id} 
              value={option.id}
              className="py-1"
            >
              {option.name}
            </option>
          ))}
        </select>
      </div>
      
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map(option => (
            <span 
              key={option.id}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {option.name}
              <button
                type="button"
                onClick={() => onSelect(selected.filter(opt => opt.id !== option.id))}
                className="ml-1.5 inline-flex text-indigo-400 hover:text-indigo-600 focus:outline-none"
              >
                <span className="sr-only">Remove</span>
                <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
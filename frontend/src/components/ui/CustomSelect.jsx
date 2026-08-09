import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function CustomSelect({
  label,
  options = [],
  value,
  onChange,
  onAddNew,
  placeholder = 'Select...',
  isLoading = false,
  error,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(
    (opt) => opt._id === value || opt.id === value || opt.value === value
  );

  const filteredOptions = options.filter((opt) =>
    (opt.name || opt.shortName || opt.label || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAddOption =
    searchQuery.trim().length > 0 &&
    !filteredOptions.some(
      (opt) => (opt.name || opt.shortName || opt.label || '').toLowerCase() === searchQuery.trim().toLowerCase()
    ) &&
    typeof onAddNew === 'function';

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;
    setIsCreating(true);
    try {
      const newRecord = await onAddNew(searchQuery.trim());
      if (newRecord) {
        const newId = newRecord._id || newRecord.id;
        onChange(newId);
        setSearchQuery('');
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to create master inline:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative text-[12px]">
      {label && <label className="font-normal text-gray-700 block mb-1">{label}</label>}

      {/* Select Box Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-white border border-gray-300 rounded-md flex items-center justify-between transition-colors cursor-pointer ${
          compact ? 'h-7 px-1.5' : 'h-8 px-2.5'
        } ${error ? 'border-red-400 ring-1 ring-red-300' : 'focus:outline-none focus:ring-1 focus:ring-emerald-500'}`}
      >
        <span className={`truncate ${selectedOption ? 'text-gray-900 font-normal' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.shortName || selectedOption.name || selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
      </button>

      {error && <p className="text-[10px] text-red-500 font-normal mt-0.5">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden p-1 space-y-1 animate-in fade-in duration-100 min-w-[140px]">
          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-6 pr-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded text-gray-800 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="max-h-40 overflow-y-auto space-y-0.5 pt-0.5">
            {isLoading ? (
              <div className="p-2 text-center text-gray-400 flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                <span className="text-[11px]">Loading...</span>
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const optId = opt._id || opt.id || opt.value;
                const isSelected = value === optId;
                return (
                  <div
                    key={optId}
                    onClick={() => {
                      onChange(optId);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="truncate">{opt.name || opt.shortName || opt.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                  </div>
                );
              })
            ) : !showAddOption ? (
              <div className="p-2 text-center text-gray-400 text-[10px]">No records found</div>
            ) : null}

            {/* Smart Inline Creation Button */}
            {showAddOption && (
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className="w-full mt-1 p-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-emerald-800 font-medium text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                {isCreating ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                ) : (
                  <Plus className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                )}
                <span>Add "{searchQuery.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

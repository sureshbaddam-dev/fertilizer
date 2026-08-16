import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function SmartMasterSelect({
  label,
  options = [],
  value,
  onChange,
  onAddNew,
  placeholder = 'Select option...',
  isLoading = false,
  error,
  showSearchInput = true,
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

  const selectedOption = options.find((opt) => opt._id === value || opt.id === value || opt.value === value);

  const filteredOptions = options.filter((opt) =>
    (opt.name || opt.label || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAddOption =
    searchQuery.trim().length > 0 &&
    !filteredOptions.some((opt) => (opt.name || opt.label || '').toLowerCase() === searchQuery.trim().toLowerCase()) &&
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
    <div ref={containerRef} className="space-y-1 relative text-xs">
      {label && <label className="font-semibold text-gray-700 block">{label}</label>}

      {/* Select Box Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 text-left bg-gray-50/70 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
          error ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
        }`}
      >
        <span className={`truncate font-medium ${selectedOption ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.name || selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden space-y-1 p-1.5 animate-in fade-in duration-150">
          {/* Live Search Input (Optional) */}
          {showSearchInput && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
            {isLoading ? (
              <div className="p-3 text-center text-gray-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading options...</span>
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
                    className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'hover:bg-gray-100/80 text-gray-700'
                    }`}
                  >
                    <span>{opt.name || opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                );
              })
            ) : !showAddOption ? (
              <div className="p-2.5 text-center text-gray-400 text-[11px]">No matching records found</div>
            ) : null}

            {/* Smart Inline Creation Button: ➕ Add "Typed Value" */}
            {showAddOption && (
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className="w-full mt-1 p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCreating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                )}
                <span>+ Add "{searchQuery.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

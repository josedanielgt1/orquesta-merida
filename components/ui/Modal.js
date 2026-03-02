"use client"

import { useState } from 'react';

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  type = 'info',
  showCancel = false,
  showInput = false,
  inputPlaceholder = ''
}) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showInput) {
      onConfirm?.(inputValue);
      setInputValue('');
    } else {
      onConfirm?.();
    }
    onClose();
  };

  const handleCancel = () => {
    setInputValue('');
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
          <span className={`text-4xl ${getColor()}`}>{getIcon()}</span>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${getColor()} mb-2`}>
              {title}
            </h3>
            <div className="text-gray-700">
              {children}
            </div>
          </div>
        </div>

        {/* Input opcional para motivo */}
        {showInput && (
          <div className="mb-4">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {showCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
              type === 'error' || type === 'warning'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showCancel ? 'Confirmar' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client"

export default function Modal({ isOpen, onClose, title, children, type = "info" }) {
  if (!isOpen) return null;

  const typeStyles = {
    info: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200"
  };

  const iconStyles = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌"
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border-2 ${typeStyles[type]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">{iconStyles[type]}</span>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        
        <div className="text-gray-700 mb-6">
          {children}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
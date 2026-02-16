export default function Input({ label, type = "text", value, onChange, placeholder, required = false }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-gray-700 text-sm font-semibold mb-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full px-4 py-3 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-400"
      />
    </div>
  );
}
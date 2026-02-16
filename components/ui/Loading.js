export default function Loading({ message = "Cargando..." }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-700 text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}
export default function Card({ children, title }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
      {title && (
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
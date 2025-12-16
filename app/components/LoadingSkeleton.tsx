export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 mt-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4"
        >
          {/* Image box */}
          <div className="w-28 h-28 rounded-lg bg-gray-800" />

          {/* Text lines */}
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/2 bg-gray-800 rounded" />
            <div className="h-3 w-1/3 bg-gray-800 rounded" />
            <div className="h-3 w-3/4 bg-gray-800 rounded" />
            <div className="h-3 w-2/4 bg-gray-800 rounded" />
            <div className="h-3 w-1/3 bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
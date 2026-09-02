export default function Loading() {
  return (
    <div className="max-w-3xl space-y-4 animate-pulse">
      <div className="h-24 bg-gray-200 rounded-2xl" />
      <div className="h-9 w-40 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-24 bg-gray-200 rounded-2xl" />
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  );
}

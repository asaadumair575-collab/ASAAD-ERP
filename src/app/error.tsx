"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto text-center space-y-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-gray-500">{error.message || "Please try again."}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

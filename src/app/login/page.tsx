import { loginAction } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_top,_#1f2937,_#000_70%)] px-4 py-10">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-black font-bold text-xl shadow-lg">
            B
          </span>
          <h2 className="mt-4 text-xl font-semibold text-white tracking-tight">
            The Boundary Shop
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Sign in to manage your business
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/20 p-8">
          {error && (
            <div className="mb-5 border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form action={loginAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                autoFocus
                placeholder="Enter your username"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
              />
            </div>
            <SubmitButton
              pendingText="Signing in..."
              className="w-full bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/20"
            >
              Sign In
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

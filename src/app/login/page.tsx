import { loginAction } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl">
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-10 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_white,_transparent_55%)]" />
          <div className="relative">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white text-black font-bold">
              B
            </span>
          </div>
          <div className="relative space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              The Boundary Shop
            </h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Manage customers, sales, dispatch and finance in one place.
            </p>
          </div>
          <div className="relative" />
        </div>

        <div className="bg-white p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <form action={loginAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                autoFocus
                placeholder="admin"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-shadow"
              />
            </div>
            <SubmitButton
              pendingText="Signing in..."
              className="w-full bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Sign In
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

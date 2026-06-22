import { loginAction } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm px-4">
      <div className="border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          Trader CRM
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">
          Sign in to continue
        </p>

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              name="username"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
  );
}

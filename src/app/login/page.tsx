import { loginAction } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import TbsLogo from "@/components/TbsLogo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left — brand panel */}
      <div className="relative md:w-1/2 bg-[#16202E] text-white px-8 py-10 sm:px-14 sm:py-16 flex flex-col justify-between overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#BFD732]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <TbsLogo size={40} />
          <div>
            <p className="font-bold tracking-tight leading-tight">THE BOUNDARY SHOP</p>
            <p className="text-[11px] text-gray-400 tracking-wide">Internal Office System</p>
          </div>
        </div>

        <div className="relative mt-10 md:mt-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            Orders, dispatch, finance and team — in one place.
          </h1>
          <p className="text-gray-400 mt-3 max-w-md">
            For office use only.
          </p>
        </div>

        <p className="relative text-xs text-gray-500 mt-10 md:mt-0">
          © {new Date().getFullYear()} The Boundary Shop
        </p>
      </div>

      {/* Right — sign-in form */}
      <div className="md:w-1/2 bg-gray-50 flex items-center justify-center px-6 py-12 sm:px-14">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-[#16202E] tracking-tight">Sign in to the ERP</h2>
          <p className="text-sm text-gray-500 mt-1">Use the username your administrator gave you.</p>

          {error && (
            <div className="mt-6 border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={loginAction} className="space-y-5 mt-6">
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
                className="w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-[#16202E] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="•••••••• (leave blank if you're new)"
                className="w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-[#16202E] transition-all"
              />
            </div>
            <SubmitButton
              pendingText="Signing in..."
              className="w-full bg-[#16202E] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#232F42] transition-colors shadow-lg shadow-black/10"
            >
              Sign In
            </SubmitButton>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Accounts are created by your administrator under Settings → User Assign.
          </p>
        </div>
      </div>
    </div>
  );
}

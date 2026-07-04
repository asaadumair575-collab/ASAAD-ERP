import { prisma } from "@/lib/prisma";
import {
  saveBusinessProfile,
  resetAllData,
  createUser,
  deleteUser,
} from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function SettingsPage() {
  const profile = await prisma.businessProfile.findFirst();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          These details appear on your invoices.
        </p>
      </div>
      <form
        action={saveBusinessProfile}
        encType="multipart/form-data"
        className="space-y-4"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Logo</label>
          {profile?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt="Current logo"
              className="h-16 w-16 rounded-full object-cover mb-2 border border-gray-200"
            />
          )}
          <input
            type="file"
            name="logo"
            accept="image/*"
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Business / Shop Name<span className="text-black"> *</span>
          </label>
          <input
            type="text"
            name="name"
            defaultValue={profile?.name ?? ""}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
          <input
            type="text"
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Address
          </label>
          <input
            type="text"
            name="address"
            defaultValue={profile?.address ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          Save
        </SubmitButton>
      </form>

      <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            People who can log in to this app.
          </p>
        </div>

        <ul className="divide-y divide-gray-100">
          {users.map((u) => {
            const deleteUserBound = deleteUser.bind(null, u.id);
            return (
              <li
                key={u.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>{u.username}</span>
                {users.length > 1 && (
                  <form action={deleteUserBound}>
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        <form action={createUser} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Username
            </label>
            <input
              type="text"
              name="username"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <SubmitButton
            pendingText="Creating..."
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create User
          </SubmitButton>
        </form>
      </div>

      <div className="border border-red-200 bg-red-50 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-red-800">Danger Zone</h2>
          <p className="text-sm text-red-700 mt-1">
            Permanently deletes every customer, order, payment, and product
            so you can test with a clean slate. This cannot be undone.
          </p>
        </div>
        <form action={resetAllData} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-red-700 mb-1.5">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              name="confirmation"
              required
              placeholder="DELETE"
              className="border border-red-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-red-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              className="border border-red-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
            />
          </div>
          <SubmitButton
            pendingText="Deleting..."
            className="bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset All Data
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

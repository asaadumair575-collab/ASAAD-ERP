import { prisma } from "@/lib/prisma";
import { saveBusinessProfile } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function SettingsPage() {
  const profile = await prisma.businessProfile.findFirst();

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
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
    </div>
  );
}

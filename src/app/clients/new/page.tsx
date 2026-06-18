import { createClient } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19c0-2.761-2.686-5-6-5s-6 2.239-6 5M9 12a3 3 0 100-6 3 3 0 000 6zM19 8v6M16 11h6"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Add Client</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the client&apos;s details below.
          </p>
        </div>
      </div>

      <form
        action={createClient}
        className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Name"
            name="name"
            required
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0"
              />
            }
          />
          <Field
            label="Business / Shop Name"
            name="businessName"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21V9.75L12 3l9 6.75V21M9 21v-6h6v6"
              />
            }
          />
          <Field
            label="City"
            name="city"
            required
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            }
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.077-1.439l-3.808-1.142a1.5 1.5 0 00-1.586.388l-.51.51a11.25 11.25 0 01-5.292-5.292l.51-.51a1.5 1.5 0 00.388-1.586L8.439 3.327A1.5 1.5 0 007 2.25H5.625A2.25 2.25 0 003.375 4.5"
              />
            }
          />
        </div>

        <Field
          label="Address"
          name="address"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          }
        />

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any additional notes about this client..."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            Save Client
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  icon,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-black"> *</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-4 h-4"
          >
            {icon}
          </svg>
        </span>
        <input
          type={type}
          name={name}
          required={required}
          className="w-full border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
        />
      </div>
    </div>
  );
}

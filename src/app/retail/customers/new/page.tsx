import NewRetailCustomerForm from "./NewRetailCustomerForm";

export default async function NewRetailCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; city?: string; address?: string; fromDraft?: string }>;
}) {
  const params = await searchParams;
  const fromDraft = params.fromDraft === "1";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail Customer</h1>
        {fromDraft ? (
          <p className="text-sm text-green-600 mt-0.5 font-medium">✓ Details pre-filled from draft — confirm and save</p>
        ) : (
          <p className="text-sm text-gray-500 mt-0.5">Add a customer for retail / COD orders.</p>
        )}
      </div>
      <NewRetailCustomerForm
        fromDraft={fromDraft}
        defaults={{
          name: params.name ?? "",
          phone: params.phone ?? "",
          city: params.city ?? "",
          address: params.address ?? "",
        }}
      />
    </div>
  );
}

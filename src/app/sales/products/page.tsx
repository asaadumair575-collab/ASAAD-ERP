import { prisma } from "@/lib/prisma";
import { createProduct, deleteProduct } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage products to quickly add them to invoices.
        </p>
      </div>

      <form
        action={createProduct}
        className="flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded-2xl p-5"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1.5">
            Product Name
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Sale Rate
          </label>
          <input
            type="number"
            step="0.01"
            name="rate"
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Purchase Rate
          </label>
          <input
            type="number"
            step="0.01"
            name="purchaseRate"
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          Add Product
        </SubmitButton>
      </form>

      {products.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No products yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">Sale Rate</th>
                <th className="py-3 px-5 font-medium">Purchase Rate</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const deleteProductBound = deleteProduct.bind(null, p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 font-medium">{p.name}</td>
                    <td className="py-3 px-5 text-gray-600">
                      {p.rate.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {p.purchaseRate.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={deleteProductBound}>
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

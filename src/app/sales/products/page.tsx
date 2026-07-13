import { prisma } from "@/lib/prisma";
import { createProduct, deleteProduct, updateProductCost } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import DeleteButton from "@/components/DeleteButton";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your products and their cost per unit.
        </p>
      </div>

      {/* Add product */}
      <form action={createProduct} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">New Product</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1.5">Product Name <span className="text-black">*</span></label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Cotton Balls"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1.5">Cost per Unit (Rs)</label>
            <input
              type="number"
              name="cost"
              min="0"
              step="0.01"
              placeholder="e.g. 1550"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
            />
          </div>
          <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Add Product
          </SubmitButton>
        </div>
      </form>

      {/* Products list */}
      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No products yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Product</th>
                <th className="py-3 px-5">Cost per Unit</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => {
                const updateBound = updateProductCost.bind(null, p.id);
                const deleteBound = deleteProduct.bind(null, p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">{p.name}</td>
                    <td className="py-3 px-5">
                      <form action={updateBound} className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rs</span>
                          <input
                            type="number"
                            name="cost"
                            min="0"
                            step="0.01"
                            defaultValue={p.cost ?? ""}
                            placeholder="—"
                            className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          />
                        </div>
                        <SubmitButton className="text-xs text-gray-500 hover:text-black transition-colors px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                          Save
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DeleteButton action={deleteBound} message="This product will be permanently deleted." />
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

import { Download } from "lucide-react";
import Link from "next/link";
import ImportForm from "@/components/ImportForm";
import { Card, CardHeader, PageHeader, Table, Td, Th, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { IMPORT_COLUMNS } from "@/lib/csv";

export default async function ImportPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <Link href="/app/orders" className="text-sm text-gray-500 hover:text-gray-950">← Orders</Link>
      <PageHeader
        title="Import orders from CSV"
        description="For orders that come from WhatsApp, Instagram, Daraz or another website. Imported orders arrive as Confirmed, ready to book."
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page
        actions={<a href="/app/orders/import/template" className={btn("secondary")}><Download className="w-4 h-4" />Download template</a>}
      />
      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <Card className="lg:col-span-2 p-5">
          <ol className="text-sm text-gray-700 space-y-2 mb-5 list-decimal pl-5">
            <li>Download the template and open it in Excel or Google Sheets.</li>
            <li>Fill one row per order (keep the first row — the headings — as it is).</li>
            <li>For an order with several products, use one row per product with the <b>same order_number</b>.</li>
            <li>Save as CSV and upload it below.</li>
          </ol>
          <ImportForm />
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Columns" />
          <Table>
            <thead><tr><Th>Column</Th><Th>Required</Th><Th>Example</Th><Th>What to put</Th></tr></thead>
            <tbody>
              {IMPORT_COLUMNS.map((c) => (
                <tr key={c.key}>
                  <Td className="font-mono text-xs font-semibold">{c.key}</Td>
                  <Td>{c.required ? <span className="text-red-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</Td>
                  <Td className="text-gray-600 whitespace-nowrap">{c.example}</Td>
                  <Td className="text-gray-600 text-xs">{c.help}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

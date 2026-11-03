import Link from "next/link";
import HelpSearch from "@/components/HelpSearch";
import { Card, IconChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ARTICLES, CATEGORIES } from "./articles";

export default async function HelpPage() {
  await requireUser();
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gray-950 text-white px-6 sm:px-10 py-10">
        <p className="text-sm text-gray-400">Help & Guides</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 mb-6">Everything you need to set up and run your store.</h1>
        <HelpSearch items={ARTICLES.map(({ slug, title, summary, category }) => ({ slug, title, summary, category }))} />
        <div className="flex flex-wrap gap-2 mt-6 text-sm">
          {[["quick-start", "Start here"], ["connect-shopify", "Connect Shopify"], ["postex", "PostEx"], ["leopards", "Leopards"], ["tcs", "TCS"], ["csv-import", "CSV format"], ["api-webhooks", "Webhooks & API"]].map(([s, l]) => (
            <Link key={s} href={`/app/help/${s}`} className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5">{l}</Link>
          ))}
        </div>
      </div>
      {CATEGORIES.map((cat) => (
        <section key={cat}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ARTICLES.filter((a) => a.category === cat).map((a) => (
              <Link key={a.slug} href={`/app/help/${a.slug}`} className="group">
                <Card className="p-5 h-full group-hover:border-gray-950 transition-colors">
                  <IconChip icon={a.icon} size="sm" />
                  <p className="font-semibold text-gray-950 mt-3">{a.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{a.summary}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

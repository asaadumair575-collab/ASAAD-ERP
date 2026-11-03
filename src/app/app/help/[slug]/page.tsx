import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, IconChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/shopify";
import { ARTICLES, articleBySlug } from "../articles";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const related = ARTICLES.filter((a) => a.category === article.category && a.slug !== article.slug);

  return (
    <div className="grid lg:grid-cols-[1fr_18rem] gap-8 items-start">
      <article className="min-w-0">
        <Link href="/app/help" className="text-sm text-gray-500 hover:text-gray-950">← Help & Guides</Link>
        <div className="flex items-center gap-3 mt-4">
          <IconChip icon={article.icon} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{article.category}</p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">{article.title}</h1>
          </div>
        </div>
        <p className="text-gray-500 mt-3">{article.summary}</p>
        <Card className="mt-6 p-6 sm:p-8 text-[15px]">{article.body({ appUrl: appUrl() })}</Card>
      </article>
      <aside className="space-y-4 lg:sticky lg:top-0">
        {related.length > 0 && (
          <Card className="p-5">
            <p className="text-sm font-semibold text-gray-950 mb-3">More in {article.category}</p>
            <ul className="space-y-2 text-sm">
              {related.map((a) => <li key={a.slug}><Link href={`/app/help/${a.slug}`} className="text-gray-600 hover:text-gray-950">{a.title}</Link></li>)}
            </ul>
          </Card>
        )}
        <Card className="p-5">
          <p className="text-sm font-semibold text-gray-950 mb-3">All guides</p>
          <ul className="space-y-2 text-sm">
            {ARTICLES.map((a) => <li key={a.slug}><Link href={`/app/help/${a.slug}`} className={a.slug === article.slug ? "font-semibold text-gray-950" : "text-gray-600 hover:text-gray-950"}>{a.title}</Link></li>)}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import {
  Ban, BookOpen, Boxes, Code2, FileSpreadsheet, KeyRound, LifeBuoy, MessageCircle, Printer, Receipt, Rocket, ShoppingBag, Truck, Users, Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { IMPORT_COLUMNS } from "@/lib/csv";
import { SHOPIFY_API_VERSION, SHOPIFY_SCOPES } from "@/lib/shopify";

// The in-app help centre. Every guide a store owner needs to set up and run
// the software without outside help. `ctx` carries live values (this site's
// URLs) so the guides show exactly what to paste.

export type HelpCtx = { appUrl: string };
export type Article = { slug: string; title: string; summary: string; category: string; icon: LucideIcon; body: (ctx: HelpCtx) => ReactNode };

export const CATEGORIES = ["Getting started", "Shopify", "Couriers", "Orders", "Money", "Store & team", "Technical"] as const;

// ── Small building blocks for guide text ──────────────────────────────────

function Steps({ children }: { children: ReactNode }) {
  return <ol className="space-y-3 my-4 [counter-reset:step]">{children}</ol>;
}
function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3 [counter-increment:step]">
      <span className="w-7 h-7 shrink-0 rounded-full bg-gray-950 text-white text-xs font-bold flex items-center justify-center before:content-[counter(step)]" />
      <div className="pt-0.5">
        <p className="font-semibold text-gray-950">{title}</p>
        {children && <div className="text-gray-600 mt-1 space-y-1">{children}</div>}
      </div>
    </li>
  );
}
function H({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="text-lg font-bold text-gray-950 mt-8 mb-2 scroll-mt-6">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="text-gray-700 my-2 leading-relaxed">{children}</p>;
}
function Tip({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return <div className={`my-4 rounded-xl px-4 py-3 text-sm ${tone === "warn" ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-gray-50 text-gray-700 border border-gray-200"}`}>{children}</div>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] text-gray-900 break-all">{children}</code>;
}
function Block({ children }: { children: ReactNode }) {
  return <pre className="my-3 rounded-xl bg-gray-950 text-gray-100 p-4 text-[13px] overflow-x-auto whitespace-pre-wrap break-all">{children}</pre>;
}
function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="my-4 rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="grid sm:grid-cols-[14rem_1fr] gap-1 sm:gap-4 px-4 py-2.5">
          <span className="font-medium text-gray-950">{k}</span>
          <span className="text-gray-600">{v}</span>
        </div>
      ))}
    </div>
  );
}
const A = ({ href, children }: { href: string; children: ReactNode }) =>
  href.startsWith("/") ? <Link href={href} className="font-medium text-gray-950 underline">{children}</Link> : <a href={href} target="_blank" rel="noreferrer" className="font-medium text-gray-950 underline">{children}</a>;

// ── Articles ──────────────────────────────────────────────────────────────

export const ARTICLES: Article[] = [
  {
    slug: "quick-start",
    title: "Start here: set up in 10 minutes",
    summary: "The five things to do on day one so orders, couriers and profit all work.",
    category: "Getting started",
    icon: Rocket,
    body: () => (
      <>
        <P>Do these once. After that the software runs on its own — new orders arrive, parcels get tracked and your COD is counted automatically.</P>
        <Steps>
          <Step title="Add your store details">Go to <A href="/app/settings">Settings → Store details</A>. Enter the store name, phone/WhatsApp number and return address. They are printed on packing slips and used in WhatsApp messages.</Step>
          <Step title="Connect Shopify">Go to <A href="/app/integrations">Integrations</A> and follow <A href="/app/help/connect-shopify">Connect your Shopify store</A>. Your last 60 days of orders and all products are imported straight away.</Step>
          <Step title="Connect your courier">On the same page enter your PostEx, Leopards or TCS API details (<A href="/app/help/postex">PostEx</A> · <A href="/app/help/leopards">Leopards</A> · <A href="/app/help/tcs">TCS</A>). We test them before saving, so you know immediately if something is wrong.</Step>
          <Step title="Add product costs">Open <A href="/app/inventory">Inventory</A> and type the cost price of each product. Without costs we can&apos;t show real profit.</Step>
          <Step title="Add your team (optional)">In <A href="/app/settings">Settings → Team</A> create logins for staff who confirm and book orders. Staff can&apos;t change integrations or the team.</Step>
        </Steps>
        <Tip>Not on Shopify? Add orders by hand with <b>New order</b>, or bring many at once with <A href="/app/help/csv-import">CSV import</A>.</Tip>
      </>
    ),
  },
  {
    slug: "daily-workflow",
    title: "Your daily routine",
    summary: "Confirm → book → print → hand over → track → collect COD. The whole day in one page.",
    category: "Getting started",
    icon: BookOpen,
    body: () => (
      <>
        <Steps>
          <Step title="Confirm new orders">Open <A href="/app/orders?status=NEW">Orders → New</A>. Open an order and use <b>WhatsApp the customer → Confirm order</b> to send a ready-written message. When they reply, tick the order and press <b>Confirm</b>. Fake or unreachable? Press <b>Cancel</b>, and <A href="/app/help/blocklist">block the number</A> if needed.</Step>
          <Step title="Book parcels">Open <A href="/app/orders?status=CONFIRMED">Orders → Confirmed</A>, tick all (top checkbox), choose the courier and press <b>Book parcels</b>. Each order gets a tracking number and, on Shopify, is marked fulfilled with that tracking number — Shopify emails the customer.</Step>
          <Step title="Print slips">With the orders still ticked (or from <A href="/app/orders?status=BOOKED">Booked</A>) press <b>Print slips</b>. Two slips per A4 page with tracking barcode, COD amount and items. Courier airway bills are also linked from each order when the courier provides one.</Step>
          <Step title="Track">The <A href="/app/shipments">Shipments</A> page updates itself (every couple of hours while anyone uses the app, plus once a night). Press <b>Refresh tracking</b> to check right now. Watch the <b>Stuck</b> tab — parcels with no movement for 5+ days.</Step>
          <Step title="Collect COD">When the courier pays you, open <A href="/app/cod">COD & Profit</A>, tick the delivered parcels in their payment and press <b>Mark paid</b>. What&apos;s left in <b>Payment pending</b> is what couriers still owe you.</Step>
        </Steps>
        <Tip>The dashboard&apos;s <b>Needs your attention</b> box always shows what&apos;s waiting: orders to confirm, orders to book, stuck parcels and low stock.</Tip>
      </>
    ),
  },
  {
    slug: "connect-shopify",
    title: "Connect your Shopify store",
    summary: "Step by step: create a small app in Shopify, copy its keys, paste them here. About 5 minutes.",
    category: "Shopify",
    icon: ShoppingBag,
    body: ({ appUrl }) => (
      <>
        <P>There are three ways to connect. Use the first one you can see on the <A href="/app/integrations">Integrations</A> page.</P>
        <KV rows={[
          ["1. Connect Shopify button", "One click — only shown if your provider has set up their Shopify app. Enter your store address, approve on Shopify, done."],
          ["2. Client ID + Client secret", "Recommended for everyone else. Works for every store, including new ones. Steps below."],
          ["3. Access token (shpat_…)", "Only if you already made a custom app in Shopify admin before 2026 and have its Admin API token."],
        ]} />

        <H id="client">Method 2 — Client ID + Client secret (recommended)</H>
        <P>Since 1 January 2026 Shopify makes new apps in its <b>Dev Dashboard</b> instead of inside the store admin. You create a small private app for your own store; it takes about 5 minutes.</P>
        <Steps>
          <Step title="Open Shopify's Dev Dashboard">Log in to Shopify with the <b>same account that owns the store</b>, then open <A href="https://dev.shopify.com/dashboard">dev.shopify.com/dashboard</A>. (From the store admin you can also go to <b>Settings → Apps → Develop apps</b>; Shopify sends you to the Dev Dashboard.)</Step>
          <Step title="Create an app">Click <b>Create app</b>, choose to start from the Dev Dashboard, name it e.g. <Code>Order Manager</Code>.</Step>
          <Step title="Give it access (scopes)">In the app&apos;s <b>Versions</b> / <b>Configuration</b> section, under <b>Access → Scopes</b>, add exactly these Admin API scopes:
            <Block>{SHOPIFY_SCOPES.split(",").join("\n")}</Block>
            Leave the App URL as it is (any https address is fine, e.g. <Code>{appUrl}</Code>). Click <b>Release</b> / <b>Save</b> to create a version.
          </Step>
          <Step title="Install it on your store">From the app&apos;s overview click <b>Install app</b>, pick your store and approve. The app must be installed — otherwise Shopify won&apos;t hand out access.</Step>
          <Step title="Copy the Client ID and Client secret">Open the app&apos;s <b>Settings</b> (or <b>Client credentials</b>). Copy the <b>Client ID</b> and the <b>Client secret</b> (secret starts with <Code>shpss_</Code>; click the eye icon to reveal).</Step>
          <Step title="Paste them here">On <A href="/app/integrations">Integrations → Shopify</A> choose <b>Client ID + secret</b>, enter your store address (<Code>yourstore.myshopify.com</Code> — find it in Shopify admin under <b>Settings → Domains</b>), paste both values and press <b>Connect</b>.</Step>
        </Steps>
        <P>We fetch a fresh access token from Shopify every 24 hours automatically, register the order webhooks so new orders arrive in seconds, and import your last 60 days of orders and all products.</P>
        <Tip tone="warn"><b>&ldquo;Shopify says this app isn&apos;t allowed on this store&rdquo;</b> means the app was created under a different Shopify account/organization than the store. Create it while logged in as the store owner, and install it on the store.</Tip>

        <H id="token">Method 3 — Admin API access token</H>
        <Steps>
          <Step title="Find your existing custom app">Shopify admin → <b>Settings → Apps → Develop apps</b> → open the app you made earlier.</Step>
          <Step title="Check its scopes">Under <b>Configuration → Admin API integration</b> make sure the scopes listed above are ticked. Save.</Step>
          <Step title="Copy the token">Under <b>API credentials → Admin API access token</b> (starts with <Code>shpat_</Code>). Shopify shows it only once — if it&apos;s hidden you must create a new app with Method 2.</Step>
          <Step title="Paste it">Integrations → Shopify → <b>Access token</b>, enter store address + token → Connect.</Step>
        </Steps>
        <Tip>With a pasted token, orders are pulled every 10 minutes while the app is open and once a night (Shopify won&apos;t send instant webhooks to a token-only connection). Methods 1 and 2 are instant.</Tip>

        <H>What gets synced</H>
        <KV rows={[
          ["Orders", "All orders from the last 60 days on first connect, then every new and edited order. Cancelled in Shopify → cancelled here (if not yet booked)."],
          ["COD detection", "Orders whose payment gateway is Cash on Delivery / manual, or that are unpaid, are treated as COD; paid orders as Prepaid."],
          ["Products", "Title, variant, SKU, price, stock and image. Stock for Shopify products is managed in Shopify; you add the cost price here."],
          ["Customers", "Name, phone, email and city from the order's shipping address (phone falls back to the customer's phone)."],
          ["Back to Shopify", "When you book a parcel, the order is marked fulfilled in Shopify with the courier name, tracking number and tracking link."],
        ]} />
      </>
    ),
  },
  {
    slug: "postex",
    title: "Connect PostEx",
    summary: "Where to find your PostEx API token and pickup address code.",
    category: "Couriers",
    icon: Truck,
    body: () => (
      <>
        <KV rows={[["You need", "API token · Pickup address code"], ["Booking", "Creates the order on PostEx with COD amount, items, customer address and your pickup address"], ["Tracking", "Reads the PostEx status for every booked parcel"]]} />
        <Steps>
          <Step title="Log in to the PostEx merchant portal">Open <A href="https://merchant.postex.pk">merchant.postex.pk</A> with your merchant account.</Step>
          <Step title="Get the API token">Open the <b>Integration</b> / <b>API</b> section of your profile and copy the <b>API token</b>. Not there? Ask your PostEx account manager to enable API access — they send you the token.</Step>
          <Step title="Get the pickup address code">In the portal open <b>Pickup addresses</b> (or <b>Settings → Addresses</b>). Each address has a short code, e.g. <Code>001</Code>. Use the warehouse the rider collects from.</Step>
          <Step title="Paste both in Integrations">Go to <A href="/app/integrations">Integrations → PostEx</A>, paste them and press <b>Connect</b>. We make a test call; if PostEx rejects the token you&apos;ll see the reason straight away.</Step>
        </Steps>
        <Tip>Cities must match PostEx&apos;s city list. If a booking fails with a city error, fix the spelling on the order (e.g. <Code>Rawalpindi</Code>, not <Code>Pindi</Code>) and book again.</Tip>
      </>
    ),
  },
  {
    slug: "leopards",
    title: "Connect Leopards Courier",
    summary: "Getting your Leopards API key and API password.",
    category: "Couriers",
    icon: Truck,
    body: () => (
      <>
        <KV rows={[["You need", "API key · API password"], ["Booking", "Books a packet with COD amount, weight, pieces and consignee details"], ["Tracking", "Reads Leopards packet status (Pickup, In transit, Delivered, Returned…)"]]} />
        <Steps>
          <Step title="Log in to the Leopards merchant panel">Use your Leopards (LCS) merchant login.</Step>
          <Step title="Generate API credentials">Open the <b>API</b> / <b>API Management</b> section and generate (or view) your <b>API key</b> and <b>API password</b>. If the section isn&apos;t visible, ask your Leopards sales representative to enable API access on your account.</Step>
          <Step title="Paste them in Integrations">Go to <A href="/app/integrations">Integrations → Leopards</A>, paste both, press <b>Connect</b>. We verify them with a test call.</Step>
        </Steps>
        <Tip>The pickup (origin) city is the one set on your Leopards account. Parcels are booked under the shipper details registered with Leopards.</Tip>
      </>
    ),
  },
  {
    slug: "tcs",
    title: "Connect TCS",
    summary: "What to ask TCS for and how to fill the connection form.",
    category: "Couriers",
    icon: Truck,
    body: () => (
      <>
        <KV rows={[
          ["API client ID", "The X-IBM-Client-Id TCS gives you for their API"],
          ["Username / Password", "Your TCS API (COD) user — not always the same as the website login"],
          ["Cost center code", "Your account's cost center, shown on TCS invoices / given by TCS"],
          ["Pickup city", "City the rider collects from, in TCS spelling (e.g. LAHORE)"],
          ["API base URL", "Leave empty unless TCS gives you a different address"],
        ]} />
        <Steps>
          <Step title="Ask TCS for API access">Email or call your TCS account manager: “Please enable COD booking & tracking API access for my account and send the client ID, API username, password and cost center code.”</Step>
          <Step title="Fill the form">Go to <A href="/app/integrations">Integrations → TCS</A>, fill every field and press <b>Connect</b>. We test the login before saving.</Step>
        </Steps>
        <Tip tone="warn">TCS issues API access per account and sometimes uses a different API address for your region. If the test fails with “not found”, ask TCS for the correct API base URL and paste it in the last field.</Tip>
      </>
    ),
  },
  {
    slug: "tracking",
    title: "Booking & tracking parcels",
    summary: "What each status means, how often tracking updates, stuck and returned parcels.",
    category: "Couriers",
    icon: Truck,
    body: () => (
      <>
        <H>Order statuses</H>
        <KV rows={[
          ["New", "Just arrived. Confirm it with the customer."],
          ["Confirmed", "Customer confirmed — ready to book."],
          ["Booked", "Courier has the booking; waiting for pickup."],
          ["In transit", "Picked up and moving (includes out for delivery)."],
          ["Delivered", "Customer received it. COD becomes “payment pending” until you mark it paid."],
          ["Returned", "Refused or undeliverable — coming back to you. The courier charge is counted as a loss."],
          ["Cancelled", "Cancelled before booking."],
        ]} />
        <H>How tracking updates</H>
        <P>Every parcel is checked with its courier automatically: while anyone uses the app (parcels not checked in the last 2 hours) and once every night for all parcels. <b>Refresh tracking</b> on the Shipments page checks right away. The exact courier wording is shown as “Courier says” on each order.</P>
        <H>If something goes wrong</H>
        <KV rows={[
          ["Booking failed", "The error from the courier is shown next to the order — usually a missing phone/address or a misspelt city. Fix it on the order page and book again."],
          ["Stuck parcels", "Shipments → Stuck lists parcels with no movement for 5+ days. Call the courier with the tracking number."],
          ["Wrong status", "On the order page you can mark a parcel Delivered or Returned by hand."],
        ]} />
      </>
    ),
  },
  {
    slug: "csv-import",
    title: "Import orders from a spreadsheet (CSV)",
    summary: "Bring WhatsApp, Instagram, Daraz or website orders in bulk. Exact column format.",
    category: "Orders",
    icon: FileSpreadsheet,
    body: () => (
      <>
        <Steps>
          <Step title="Download the template"><A href="/app/orders/import/template">Download orders-import-template.csv</A> and open it in Excel or Google Sheets.</Step>
          <Step title="Fill one row per order">Keep the first row (headings) exactly as it is. For several products in one order, add one row per product with the same <Code>order_number</Code>.</Step>
          <Step title="Save as CSV">Excel: <b>File → Save As → CSV UTF-8 (Comma delimited)</b>. Google Sheets: <b>File → Download → Comma-separated values</b>.</Step>
          <Step title="Upload"><A href="/app/orders/import">Orders → Import CSV</A>. Orders come in as <b>Confirmed</b>, ready to book. Rows with problems are skipped and listed with the row number and reason.</Step>
        </Steps>
        <H>Columns</H>
        <KV rows={IMPORT_COLUMNS.map((c) => [<span key={c.key}><Code>{c.key}</Code>{c.required && <span className="text-red-600 ml-1">*</span>}</span>, <span key="h">{c.help} <span className="text-gray-400">e.g. {c.example}</span></span>])} />
        <P><span className="text-red-600">*</span> required. Up to 2,000 rows per file. An order number that already exists is skipped, so uploading the same file twice is safe.</P>
      </>
    ),
  },
  {
    slug: "exports",
    title: "Export orders & customers",
    summary: "Download everything to Excel for your accountant, ads audiences or backups.",
    category: "Orders",
    icon: FileSpreadsheet,
    body: () => (
      <>
        <KV rows={[
          ["Orders", <>Orders page → <b>Export</b>. Exports the tab you&apos;re on (or all). Columns: order, date, source, customer, phone, city, address, items, quantities, subtotal, discount, shipping, total, payment, status, courier, tracking, courier status, COD amount, courier charge, COD received, delivered/returned dates.</>],
          ["Customers", <>Customers page → <b>Export</b>. One row per phone number: name, email, city, address, orders, delivered, returned, total spent, first/last order, blocked.</>],
        ]} />
        <Tip>Files are CSV (UTF-8), which open directly in Excel and Google Sheets. Upload the customers file to Facebook/Meta as a Custom Audience to retarget buyers.</Tip>
      </>
    ),
  },
  {
    slug: "print-slips",
    title: "Print packing slips",
    summary: "Slips with tracking barcode, COD amount and items — two per A4 page.",
    category: "Orders",
    icon: Printer,
    body: () => (
      <>
        <Steps>
          <Step title="Select orders">On <A href="/app/orders">Orders</A>, tick the orders (new, confirmed or booked) and press <b>Print slips</b>. For one order use <b>Print slip</b> on the order page.</Step>
          <Step title="Print">A new tab opens; press <b>Print</b>. Choose A4, margins “Default”, and turn off “Headers and footers” in the print dialog.</Step>
        </Steps>
        <P>Each slip shows your store details (from <A href="/app/settings">Settings</A>), customer name, phone, address and city in large letters, the amount to collect, the items, and scannable Code-128 barcodes for the tracking number and order number.</P>
      </>
    ),
  },
  {
    slug: "whatsapp",
    title: "WhatsApp messages to customers",
    summary: "Ready-written confirm, dispatch, reminder and thank-you messages — one tap.",
    category: "Orders",
    icon: MessageCircle,
    body: () => (
      <>
        <P>Every order page has a <b>WhatsApp the customer</b> box. Tapping a message opens WhatsApp (phone or WhatsApp Web) with the text already typed — you just press send. Numbers like <Code>0300…</Code> are converted to <Code>92300…</Code> automatically.</P>
        <KV rows={[
          ["Confirm order", "Order number, total, address — asks the customer to reply YES."],
          ["Dispatched + tracking", "Courier name, tracking number and link, COD amount to keep ready."],
          ["Delivery reminder", "Asks them to keep their phone on for the rider."],
          ["Couldn't reach you", "When the customer doesn't answer calls."],
          ["Thank you + review", "After delivery — asks for a review or photo."],
        ]} />
        <Tip>Confirming COD orders on WhatsApp before booking is the single best way to cut returns.</Tip>
      </>
    ),
  },
  {
    slug: "blocklist",
    title: "Block fake or repeat-refusal numbers",
    summary: "Stop paying delivery charges for customers who never accept parcels.",
    category: "Orders",
    icon: Ban,
    body: () => (
      <>
        <Steps>
          <Step title="Block a number">On an order page press <b>Block number</b> (top of the Customer box), or go to <A href="/app/customers?view=blocked">Customers → Blocked numbers</A> and add it.</Step>
          <Step title="What happens">Orders from that number show a red <b>BLOCKED</b> tag in the order list, and booking them is refused with a clear message.</Step>
          <Step title="Unblock">Press <b>Unblock</b> next to the number at any time.</Step>
        </Steps>
        <Tip>The Customers page marks a buyer <b>Risky</b> when their returns are equal to or more than their deliveries, and every order shows “N past returns” — use these to decide whom to block.</Tip>
      </>
    ),
  },
  {
    slug: "inventory",
    title: "Inventory & stock alerts",
    summary: "Costs, stock levels and low-stock alerts.",
    category: "Store & team",
    icon: Boxes,
    body: () => (
      <>
        <KV rows={[
          ["Shopify products", "Stock comes from Shopify and updates when Shopify changes. You only enter the cost price here."],
          ["Your own products", "Add with Add product; edit stock here directly."],
          ["Cost", "Price you pay per piece. Used for profit."],
          ["Alert at", "When stock falls to this number the product shows as Low stock on the dashboard and Inventory → Low stock."],
        ]} />
      </>
    ),
  },
  {
    slug: "profit",
    title: "How COD & profit are worked out",
    summary: "The exact formula behind net profit, COD received, pending and in transit.",
    category: "Money",
    icon: Wallet,
    body: () => (
      <>
        <H>Net profit (last 30 days)</H>
        <Block>{`  Delivered sales        (orders placed in the last 30 days that were delivered)
− Product cost           (quantity × cost price from Inventory)
− Courier charges        (on those delivered parcels)
− Return losses          (courier charges on parcels returned in the period)
= Gross profit
− Expenses               (ads, packaging, salaries… added on the Expenses page)
= Net profit`}</Block>
        <P>Only delivered orders count as sales — pending and returned orders aren&apos;t money yet. If any sold product has no cost price, you&apos;ll see a warning; add it in <A href="/app/inventory">Inventory</A>.</P>
        <H>COD figures</H>
        <KV rows={[
          ["COD received", "Delivered COD parcels you marked as paid."],
          ["Delivered, payment pending", "Delivered COD the courier hasn't paid you yet — check this against the courier's payment report."],
          ["COD in transit / with couriers", "COD amount on parcels not yet delivered."],
        ]} />
      </>
    ),
  },
  {
    slug: "expenses",
    title: "Expenses",
    summary: "Track ad spend and running costs for real net profit and cost per order.",
    category: "Money",
    icon: Receipt,
    body: () => (
      <>
        <P>Add each cost on <A href="/app/expenses">Expenses</A> with a category and date — e.g. daily Facebook ad spend, a packaging order, monthly salaries. They are taken off profit for the period they fall in.</P>
        <KV rows={[
          ["Ad spend", "Every category containing “ads” (Facebook/Instagram, TikTok, Google)."],
          ["Cost per order (ads)", "Ad spend ÷ orders received in the last 30 days — your customer acquisition cost."],
          ["Total cost per order", "All expenses ÷ orders."],
        ]} />
      </>
    ),
  },
  {
    slug: "team",
    title: "Team members & roles",
    summary: "Owner vs staff, adding people, passwords.",
    category: "Store & team",
    icon: Users,
    body: () => (
      <>
        <KV rows={[
          ["Owner", "Everything, including integrations (Shopify, couriers), store details and the team."],
          ["Staff", "Orders, shipments, inventory, customers, COD, expenses and reports. Can't change integrations or the team."],
        ]} />
        <P>Add people in <A href="/app/settings">Settings → Team</A>. Each person signs in with their own email so the order activity shows who did what. Everyone can change their own password in Settings.</P>
      </>
    ),
  },
  {
    slug: "api-webhooks",
    title: "Technical reference: API, webhooks & security",
    summary: "Webhook URL and topics, API versions, scopes, sync timings and how credentials are stored.",
    category: "Technical",
    icon: Code2,
    body: ({ appUrl }) => (
      <>
        <H>Shopify</H>
        <KV rows={[
          ["Admin API version", <Code key="v">{SHOPIFY_API_VERSION}</Code>],
          ["Scopes", <Code key="s">{SHOPIFY_SCOPES}</Code>],
          ["Webhook URL", <Code key="w">{appUrl}/api/shopify/webhook</Code>],
          ["Webhook topics", "orders/create · orders/updated · products/update · app/uninstalled (registered automatically on connect)"],
          ["Webhook security", "Each delivery is verified with HMAC-SHA256 (X-Shopify-Hmac-Sha256) using the app's secret; unsigned calls are rejected."],
          ["OAuth redirect URL", <Code key="r">{appUrl}/api/shopify/callback</Code>],
          ["Client credentials", "POST https://{store}.myshopify.com/admin/oauth/access_token with grant_type=client_credentials; token lasts 24 h and is renewed automatically."],
          ["First sync", "Orders from the last 60 days + all products; afterwards only orders changed since the last sync."],
        ]} />
        <H>Couriers</H>
        <KV rows={[
          ["PostEx", "api.postex.pk — create order (v3) and track order with your API token in the token header"],
          ["Leopards", "merchantapi.leopardscourier.com — book packet and track booked packet with api_key / api_password"],
          ["TCS", "TCS COD booking & tracking API (X-IBM-Client-Id + user login); base URL configurable"],
          ["Tracking schedule", "On every app visit for parcels not checked in 2 h (up to 25 at a time), nightly for all, and on demand with Refresh tracking"],
        ]} />
        <H>Security</H>
        <KV rows={[
          ["Credentials", "Shopify tokens/secrets and courier API keys are encrypted with AES-256-GCM before they are saved."],
          ["Passwords", "Stored as salted scrypt hashes; 5 wrong attempts lock sign-in for 10 minutes."],
          ["Sessions", "Signed, HTTP-only cookies; changing access or resetting a password signs the user out everywhere."],
          ["Data separation", "Every store's data is kept separate; a store can only ever see its own orders, customers and settings."],
        ]} />
      </>
    ),
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting & FAQ",
    summary: "Common error messages and what to do.",
    category: "Technical",
    icon: LifeBuoy,
    body: () => (
      <>
        <KV rows={[
          ["“Shopify rejected the access token”", <>The app was uninstalled or its access changed. Reconnect on <A href="/app/integrations">Integrations</A>.</>],
          ["“Shopify didn't accept the Client ID / secret”", "Copy them again from the Dev Dashboard (no spaces). The secret starts with shpss_. Make sure the app is installed on the store."],
          ["“…isn't allowed on this store” / shop_not_permitted", "Create the app logged in as the store owner, under the same Shopify organization as the store."],
          ["Orders not appearing", <>Integrations → Shopify → <b>Sync now</b>. If “Last sync failed” is shown, the message says why.</>],
          ["Booking fails: city", "Use the courier's spelling of the city; edit it on the order and book again."],
          ["Booking fails: missing phone, city or address", "Fill the customer details on the order page, Save details, book again."],
          ["Booking refused: blocked number", <>The phone is on your <A href="/app/customers?view=blocked">blocked list</A>.</>],
          ["Courier won't connect", "The test call shows the courier's own error. Wrong key/password is the usual cause; ask the courier to confirm API access is enabled."],
          ["Profit looks too high", <>Add cost prices in <A href="/app/inventory">Inventory</A> and your ad spend in <A href="/app/expenses">Expenses</A>.</>],
          ["Access ended", "Your plan or demo has finished. Your data is kept — contact your provider to continue."],
        ]} />
      </>
    ),
  },
  {
    slug: "security-keys",
    title: "Keeping your keys safe",
    summary: "Who can see your API keys and what to do if one leaks.",
    category: "Technical",
    icon: KeyRound,
    body: () => (
      <>
        <P>After you save a key it is encrypted and never shown again — not to you, your staff or anyone else. Only the owner can connect or disconnect integrations.</P>
        <Steps>
          <Step title="If a key leaks">Generate a new key in the courier portal (or a new client secret in Shopify&apos;s Dev Dashboard), then disconnect and reconnect here with the new one.</Step>
          <Step title="When staff leave">Remove them in Settings → Team. They are signed out immediately.</Step>
        </Steps>
      </>
    ),
  },
];

export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);

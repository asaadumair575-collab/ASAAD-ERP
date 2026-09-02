import DateRangeNav from "@/components/DateRangeNav";

export default function DateNav({ from, to }: { from: string; to: string }) {
  return <DateRangeNav from={from} to={to} basePath="/ecommerce/shopify-dashboard" />;
}

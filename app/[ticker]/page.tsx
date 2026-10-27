import { CompanyProfile } from "@/components/ui/company-profile";
import { loadPriceHistory } from "@/lib/investo-ro.server";

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const series = await loadPriceHistory(ticker);
  return <CompanyProfile ticker={ticker} series={series} />;
}

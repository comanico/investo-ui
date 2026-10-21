import { CompanyProfile } from "@/components/ui/company-profile";

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  return <CompanyProfile ticker={ticker} />;
}

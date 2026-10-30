import { BookPageGate } from "@/components/ui/book-gate";
import { PortfolioProfile } from "@/components/ui/portfolio-profile";

export default function PortfolioPage() {
  return (
    <BookPageGate>
      <PortfolioProfile />
    </BookPageGate>
  );
}

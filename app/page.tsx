import { AskBar } from "@/components/ui/ask-bar";

export default function Home() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
      <h1 className="wordmark text-6xl leading-none sm:text-7xl">Investo</h1>
      <AskBar />
    </main>
  );
}

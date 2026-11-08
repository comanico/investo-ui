import { AskBar } from "@/components/ui/ask-bar";

export default function Home() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-8">
      <div className="my-auto flex w-full flex-col items-center gap-8 pb-8">
        <h1 className="wordmark text-6xl leading-none sm:text-7xl">Investo</h1>
        <AskBar />
      </div>
    </main>
  );
}

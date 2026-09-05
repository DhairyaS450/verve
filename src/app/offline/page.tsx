import { Vero } from "@/components/Vero";

export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <Vero pose="perched" size={140} />
      <p className="label mt-8">Offline</p>
      <h1 className="font-display font-medium text-[34px] leading-tight tracking-[-0.03em] mt-2">No signal. Practice anyway.</h1>
      <p className="mt-3 text-[15px] text-ink-2 max-w-[34ch]">Spin a topic in your head, talk for a minute, then come back online to record.</p>
      <a href="/today" className="btn mt-8">
        Try again
      </a>
    </main>
  );
}

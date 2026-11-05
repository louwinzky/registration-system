import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-muted-foreground">Your role can’t open this section.</p>
      <Link href="/" className="text-primary underline">
        Back to my dashboard
      </Link>
    </main>
  );
}

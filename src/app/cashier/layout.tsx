import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/rbac";

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CASHIER", "ADMIN");
  return (
    <AppShell
      title="Cashier"
      userName={user.name ?? ""}
      nav={[
        { href: "/cashier", label: "Collect payment" },
        { href: "/cashier/payments", label: "Payments" },
      ]}
    >
      {children}
    </AppShell>
  );
}

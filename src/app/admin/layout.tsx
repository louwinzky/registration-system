import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <AppShell
      title="Admin"
      userName={user.name ?? ""}
      nav={[
        { href: "/admin", label: "Users" },
        { href: "/admin/payments", label: "Void payments" },
        { href: "/registrar", label: "Registrar" },
        { href: "/cashier", label: "Cashier" },
      ]}
    >
      {children}
    </AppShell>
  );
}

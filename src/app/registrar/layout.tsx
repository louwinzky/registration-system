import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/rbac";

export default async function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("REGISTRAR", "ADMIN");
  return (
    <AppShell
      title="Registrar"
      userName={user.name ?? ""}
      nav={[
        { href: "/registrar", label: "Students" },
        { href: "/registrar/students/new", label: "Register student" },
      ]}
    >
      {children}
    </AppShell>
  );
}

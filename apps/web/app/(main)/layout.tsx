import { AuthProvider } from "@/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { DemoBanner } from "@/components/layout/DemoBanner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-14">{children}</main>
        <DemoBanner />
      </div>
    </AuthProvider>
  );
}

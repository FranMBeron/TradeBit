export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar added in Step 9 */}
      <main>{children}</main>
    </div>
  );
}

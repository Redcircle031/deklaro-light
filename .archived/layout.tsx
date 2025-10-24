export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="container-responsive py-8">
      {children}
    </main>
  );
}
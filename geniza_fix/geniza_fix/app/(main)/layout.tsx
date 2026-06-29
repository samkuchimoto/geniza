// (main) route group layout — inherits root layout (Navbar, Toast).
// Only purpose: group browse, item, profile, dashboard, list routes.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import "../styles/globals.css";
import "katex/dist/katex.min.css";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { handleNextAuthLogin } from "../middleware/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";

function AuthWrapper({ children }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.frappeAuthToken) {
      handleNextAuthLogin(session);
    }
  }, [session]);

  return children;
}

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}) {
  const router = useRouter();

  // Define routes that should use the DashboardLayout
  const dashboardRoutes = ["/test", "/report", "/analysis"];

  // Check if the current route starts with any of the dashboard routes
  const isDashboardRoute = dashboardRoutes.some((route) =>
    router.pathname.startsWith(route)
  );

  // Collapse the sidebar for `/test` routes
  const isSidebarCollapsed = router.pathname.startsWith("/test");

  return (
    <SessionProvider session={session}>
      <AuthWrapper>
        {isDashboardRoute ? (
          <DashboardLayout isCollapsed={isSidebarCollapsed}>
            <Component {...pageProps} />
          </DashboardLayout>
        ) : (
          <Component {...pageProps} />
        )}
      </AuthWrapper>
    </SessionProvider>
  );
}

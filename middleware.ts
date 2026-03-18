import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/(authenticated)(.*)",
]);

export default clerkMiddleware((auth, req) => {
  try {
    const pathname = (req as any).nextUrl?.pathname || (req as any).url || "unknown";
    console.log(`[middleware] request pathname=${pathname}`);
    const protectedRoute = isProtectedRoute(req);
    console.log(`[middleware] isProtectedRoute=${protectedRoute}`);

    if (protectedRoute) {
      const a = auth();
      console.log(`[middleware] auth.userId=${a.userId ?? "<none>"}`);
      a.protect();
    }
  } catch (err) {
    console.error("[middleware] error", err);
  }
});

export const config = {
  // Match all routes except static files and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

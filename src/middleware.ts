import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)", 
    "/", 
    "/(api|trpc)(.*)",
    "/login(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/sso-callback(.*)"
  ],
};
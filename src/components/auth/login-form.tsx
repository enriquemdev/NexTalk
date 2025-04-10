"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { DebugConvex } from "./debug-convex";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn, isLoaded } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    if (!isLoaded) return;
    try {
      setIsLoading(true);
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/sso-callback",
        redirectUrlComplete: "/"
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setIsLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    if (!isLoaded) return;
    try {
      setIsLoading(true);
      await signIn.authenticateWithRedirect({
        strategy: "oauth_facebook",
        redirectUrl: window.location.origin + "/sso-callback",
        redirectUrlComplete: "/"
      });
    } catch (error) {
      console.error("Error signing in with Facebook:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome to NexTalk</CardTitle>
          <CardDescription>
            Login with your Google or Facebook account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={signInWithGoogle}
                  disabled={isLoading || !isLoaded}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {isLoading ? "Loading..." : "Login with Google"}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={signInWithFacebook}
                  disabled={isLoading || !isLoaded}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M20.007 3H3.993A.993.993 0 003 3.993v16.014c0 .549.444.993.993.993h8.628v-6.96h-2.343v-2.725h2.343V9.31c0-2.325 1.42-3.59 3.494-3.59.994 0 1.848.074 2.096.107v2.43h-1.438c-1.128 0-1.346.537-1.346 1.324v1.734h2.69l-.35 2.725h-2.34V21h4.57a.993.993 0 00.993-.993V3.993A.993.993 0 0020.007 3z"
                      fill="currentColor"
                    />
                  </svg>
                  {isLoading ? "Loading..." : "Login with Facebook"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <DebugConvex />
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}

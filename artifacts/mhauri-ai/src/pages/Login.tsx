import { SignIn } from "@clerk/react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Login() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ms-blob ms-blob-1" style={{ top: "-120px", left: "30%" }} />
        <div className="ms-blob ms-blob-2" style={{ bottom: "-80px", right: "-60px" }} />
      </div>
      <div className="relative z-10 w-full">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/`}
        />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Have an existing Mshauri password?{" "}
          <Link href="/legacy-sign-in" className="font-semibold text-[#4ade80] hover:underline">
            Use it here
          </Link>
        </p>
      </div>
    </div>
  );
}
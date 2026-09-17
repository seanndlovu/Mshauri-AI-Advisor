import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Register() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ms-blob ms-blob-1" style={{ top: "-120px", left: "30%" }} />
        <div className="ms-blob ms-blob-2" style={{ bottom: "-80px", right: "-60px" }} />
      </div>
      <div className="relative z-10 w-full">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={`${basePath}/`}
        />
      </div>
    </div>
  );
}
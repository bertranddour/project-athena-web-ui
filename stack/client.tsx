import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-in",
    afterSignIn: "/",
    afterSignUp: "/",
    passwordReset: "/auth/sign-in",
    emailVerification: "/auth/verify",
  },
});

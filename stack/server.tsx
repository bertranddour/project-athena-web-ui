import "server-only";

import { StackServerApp } from "@stackframe/stack";
import { stackClientApp } from "./client";

export const stackServerApp = new StackServerApp({
  inheritsFrom: stackClientApp,
  urls: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-in",
    afterSignIn: "/",
    afterSignUp: "/",
    passwordReset: "/auth/sign-in",
    emailVerification: "/auth/verify",
  },
});

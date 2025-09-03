"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Button from "../../components/Button";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <h1 className="text-3xl font-bold">🚀 ContentGen is live</h1>
      {session ? (
        <>
          <p>Welcome, {session.user?.name}!</p>
          <Button variant="secondary" onClick={() => signOut()}>
            Sign Out
          </Button>
        </>
      ) : (
        <Button variant="primary" onClick={() => signIn("google")}>
          Sign In with Google
        </Button>
      )}
    </main>
  );
}

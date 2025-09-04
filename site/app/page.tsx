export const dynamic = "force-dynamic";
"use client";






import { signIn, signOut, useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded-2xl shadow-md text-center">
        {session ? (
          <>
            <h1 className="text-xl font-bold mb-4">Welcome, {session.user?.name}</h1>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-4">ContentGen</h1>
            <button
              onClick={() => signIn("google")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </main>
  );
}

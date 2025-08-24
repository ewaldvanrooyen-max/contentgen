export const dynamic = 'force-static';

export default function LoginPage() {
  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form method="POST" action="/api/login" className="space-y-4">
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="border p-2 w-full"
          required
        />
        <button type="submit" className="border px-4 py-2">Enter</button>
      </form>
      <p className="mt-6 text-sm opacity-70">
        Tip: set <code>ADMIN_PASS</code> in <code>web/.env.local</code> and GitHub/Vercel secrets.
      </p>
      <p className="mt-2">
        <a className="underline" href="/api/logout">Logout</a>
      </p>
    </main>
  );
}

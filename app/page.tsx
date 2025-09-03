import Button from "../components/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <h1 className="text-3xl font-bold">🚀 ContentGen is live</h1>
      <Button variant="primary">Primary Button</Button>
      <Button variant="secondary">Secondary Button</Button>
    </main>
  );
}

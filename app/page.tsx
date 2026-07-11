export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-medium text-neutral-500">TxLINE API</p>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
        Server routes are ready
      </h1>
      <p className="mt-4 text-base text-neutral-700">
        Tokens are loaded from environment variables. Use the server routes below
        so credentials stay out of the browser.
      </p>
      <ul className="mt-6 space-y-3 font-mono text-sm text-neutral-900">
        <li>/api/txline/data/fixtures/snapshot</li>
        <li>/api/txline/data/odds/snapshot/&lt;fixtureId&gt;</li>
        <li>/api/txline/data/scores/snapshot/&lt;fixtureId&gt;</li>
      </ul>
    </main>
  );
}

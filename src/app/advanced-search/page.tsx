"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AdvancedSearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ messages: any[]; attachments: any[]; users: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/advanced-search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setResults(data))
      .finally(() => setLoading(false));
    // update URL
    router.replace(`?q=${encodeURIComponent(query)}`);
  }, [query, router]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Advanced Search</h1>
      <input
        type="text"
        placeholder="Search messages, files, users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded p-2 mb-4"
      />
      {loading && <p>Loading...</p>}
      {results && (
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-medium mb-2">Messages</h2>
            {results.messages.length === 0 ? (
              <p>No messages found.</p>
            ) : (
              <ul className="list-disc pl-5">
                {results.messages.map((m) => (
                  <li key={m.id}>
                    <a href={`/messages?thread=${m.id}`} className="text-blue-600 underline">
                      {m.content?.slice(0, 100)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-xl font-medium mb-2">Attachments</h2>
            {results.attachments.length === 0 ? (
              <p>No attachments found.</p>
            ) : (
              <ul className="list-disc pl-5">
                {results.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.url} target="_blank" rel="noopener" className="text-blue-600 underline">
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-xl font-medium mb-2">Users</h2>
            {results.users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <ul className="list-disc pl-5">
                {results.users.map((u) => (
                  <li key={u.id}>
                    {u.name} ({u.email})
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<div className="p-4 max-w-4xl mx-auto text-sm text-slate-500">Loading search…</div>}>
      <AdvancedSearchPageContent />
    </Suspense>
  );
}

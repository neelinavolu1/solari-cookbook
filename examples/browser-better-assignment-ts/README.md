# Better assignment session (TypeScript)

One Solari cloud browser per assignment. Better (Polar-for-work) is an agentic browser that manages schoolwork: it harvests the work list once, persists the item links, then clicks into the first assignment **in the page**. It does not bounce between sibling list URLs with `goto()`.

This demo uses Hacker News as a public stand-in for an assignment list. Launch is stealth, and a reusable profile keeps cookies/localStorage across runs.

Note the `solari.close()` in the `finally` block — the client keeps a loopback proxy open for connection retries, and without closing it your script will print its output and then hang instead of exiting.

## Run

```bash
cd examples/browser-better-assignment-ts
npm install
export SOLARI_API_KEY=slr_live_...   # https://console.getsolari.com
npm start
```

Source: [`index.ts`](index.ts)

# Release Checklist

1. Confirm package metadata in `package.json`.
2. Run `bun install --frozen-lockfile`.
3. Run `bun test`.
4. Run `bun run build`.
5. Smoke test package exports:

```sh
node -e "import('octra-ts').then(console.log)"
node -e "import('octra-ts/accounts').then(console.log)"
node -e "import('octra-ts/contract').then(console.log)"
node -e "import('octra-ts/adapters/browser').then(console.log)"
```

6. Run package consumer smoke:

```sh
bun run pack:smoke
```

7. Run live tests only with disposable testnet credentials:

```sh
OCTRA_LIVE=1 OCTRA_PRIVATE_KEY_HEX=... bun test test/live.integration.test.ts
```

8. Run broadcast tests only with disposable funded testnet credentials:

```sh
OCTRA_BROADCAST=1 OCTRA_PRIVATE_KEY_HEX=... bun test test/broadcast.integration.test.ts
```

9. Update `CHANGELOG.md` when one exists.
10. Publish with provenance if npm org settings support it.

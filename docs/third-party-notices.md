# Third-Party Notices

## `@0xio/pvac`

Parts of `src/pvac/vendor` and `src/pvac/wasm` are adapted from `@0xio/pvac` version `1.0.1`.

- Package: `@0xio/pvac`
- Author: 0xio Labs
- Repository: `https://github.com/0xio-xyz/0xio-pvac`
- License: MIT

The vendored code provides Octra PVAC/HFHE WASM bindings, payload builders, encoding helpers, and stealth helpers. Local changes are limited to TypeScript module resolution, packaging paths, and SDK backend integration.

## `tweetnacl`

`tweetnacl` is used as the Curve25519 fallback for stealth helpers when browser-native X25519 is unavailable.

- Package: `tweetnacl`
- License: public domain / Unlicense-style public-domain dedication

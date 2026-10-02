# Phase 6 close — 2026-10-01

Merged `claude/ship-realism` into main with `--no-ff`: `080f1088ec07863751ffd8b2fa8bf8106d4b22af`. Main was clean and pulled fast-forward only before the merge. No rebase or history rewrite.

- Product checkpoint `1644fe1`: final full browser suite 438 passed, 0 failed, 11 configured skips; independent high-depth review clean. Prior physics independent Pro review remains applicable; no physics or golden changed in the measurement repair.
- Main complete gate exited 0: 1,941 unit tests, coverage floors, 13 smoke checks, five subpath checks; build first.
- Hosted CI [36956332929](https://github.com/SteveIsnthere/StarShipSimulator/actions/runs/36956332929) and Pages deploy [36956332944](https://github.com/SteveIsnthere/StarShipSimulator/actions/runs/36956332944) succeeded at the merge SHA. Deploy gate took 12 minutes, within its 20-minute timeout. Its two menu first-attempt failures passed the existing retry; exact names and evidence are in the Phase 9 backlog, not described as a clean first-attempt run.
- Live browser deployment smoke at https://steveisnthere.github.io/StarShipSimulator/: five passed, exit 0. It covers loading and flight, asset subpaths, service-worker precaching, install manifest and icon, offline reload. This is the five-check live deployment tier, not a claim that the 438-test suite ran against production.
- The served `sw.js` matches main's verified `dist/sw.js` byte for byte; cache version `b72a7b0bad39`, 44 assets. Both CI/deploy SHA and the actual served bytes establish this is the final Phase 6 build.

Live CA diagnosis: initial manifest API request failed with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` although Chromium and curl worked. Mac System keychain export and Node's `--use-system-ca` did not resolve it; the second live suite remained red. Curl reported `/etc/ssl/cert.pem`, Let's Encrypt YR1, certificate verify OK. An independent Node fetch with `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` then returned 200 and the correct manifest. Only after that successful prerequisite was the final live suite run, 5/5 green. All assertions and TLS verification stayed enabled. Logs are retained in `2026-10-01-phase6-close/`.

The finished Phase 6 plan was already closed out. Durable physics decisions are in `docs/reference/physics-model.md`, measurement conventions in `docs/reference/testing.md`. Phase 6b's branch is `claude/entry-on-lift`, created from this main merge.

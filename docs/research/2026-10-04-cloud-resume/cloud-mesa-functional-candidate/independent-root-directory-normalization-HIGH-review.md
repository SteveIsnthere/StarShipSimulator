# Independent HIGH canonical root directory correction

Static exact two-line source-diff review supports scoped checks and separate actual spec preparation. Current preparer4b5f133e/pinsc50f6f50 and archived2bd17 source/pins are digest-bound below. No preparation, browser, imports or scans executed.

The browser walk already records relative root as empty string; the correction translates ONLY bundle directory root spelling '.' to empty string before exact dictionary comparison. Every other directory pathname and mode remains unchanged. A new length equality rejects duplicate canonical keys rather than silently collapsing '.' and ''. Existing exact12-directory/303-file+INI checks, fixed browser/receipt identities and live-output capture limits are preserved. External browserDirectories must use the same canonical root and actual runner Node localeCompare ordering; actual immutable bundle/spec association still needs its own input HIGH.

All earlier repaired source conditions and root-owned whole60s preparation/independent cleanup requirements remain. This review is no preparation/runtime/browser acceptance or execution grant.

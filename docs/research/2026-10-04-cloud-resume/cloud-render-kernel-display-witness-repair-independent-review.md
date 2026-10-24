# Fresh display-witness cause-repair code review

Read-only concrete review of the nine new files pinned below; no checks/proof/setup/build/browser execution. Actual old/new diffs show only classified witness replacement, new entry/config/path names and helper/control source inventory expansion. The new runner is byte-identical to the old reviewed runner. Old eight files and failed private setup remain preserved.

The explicit Graphics method identity branch, actual Sprite/TilingSprite/Mesh Texture/TextureSource/Rectangle validation and unknown texture/anchor rejection correctly repair the unsafe universal Sprite cast. Methods are not invoked; unknowns are not optional-chained into absent witnesses. Original state/pixel/AA/shader/query/cleanup and acceptance limits remain unchanged.

Block new build/browser approval pending one actual null-branch correction and stronger isolated SDK controls. The helper accepts a null Mesh texture whenever shader!==null, which includes undefined and arbitrary objects. Locked Mesh constructor initializes shader??null and texture??shader?.texture??Texture.WHITE, its public texture setter replaces falsy texture with Texture.EMPTY, and getter returns the stored texture. The API comment says nullable but the inspected supported constructor/setter path does not produce null. Do not add an unproved permissive null case. Simplest pinned-SDK policy: reject null textures and document that the source-supported construction uses actual Texture. Alternatively prove a genuine supported public nullable construction and validate actual Shader identity; a shadowed getter is a negative control, not evidence of a real supported null path.

The isolated controls already exercise real Container/Graphics/Sprite/TilingSprite/Mesh positives and unknown/malformed Texture/TextureSource/method negatives. Add replaced Graphics drawing-method, unknown-anchor, nonfinite TextureSource dimensions, invalid/nonfinite Rectangle and nonfinite public-anchor negatives to cover the helper's strict branches before trusting this newly introduced witness. These controls must remain pure SDK/public APIs without canvas/GL/product physics/browser initialization. Preserve bounded actual child output/status separately when root grants them.

The declaration repeats a concrete Graphics cause as if the visited class were observed. Raw failure had no class/label metadata; Graphics method misuse is a proven source failure route, while the exact encountered node is unobserved. Adjust that wording without rewriting historical receipts.

No unchanged rerun; fresh exact helper/proof code review and separately supervised pure proof precede a unique new setup/build/maps qualification. A later browser grant remains separate. Product policy/context restoration/mixed-renderer and original full-session/phone/HUD/frame acceptance are unapproved; full247 failure truth remains preserved.

## Candidate pins

- `kernel-display-witness.ts`: `b5deeb72221af70f2a6a993c1c497e3bf0404bc576b6d1781f707b4f44456afe`
- `kernel-display-witness-controls.mjs`: `27782f70c864536d017045d911f758288c4a92e994528e101509d9d41dc3d5b5`
- `render-kernel-texture-repair-entry.ts`: `8d5ddb05c1dabf9b1794a163e64d34ff53a22895874380aba206575e4a346337`
- `render-kernel-texture-repair-build.config.mjs`: `3c7130ef80bb15d242f7275ef0ad9084f8c91696e8d71c1ce281d49ece3a77b0`
- `prepare-render-kernel-texture-repair.py`: `9e3256b7402e0d53c5f434f7ab456ed700b3ba8677322e653153257c26be60c0`
- `build-render-kernel-texture-repair.mjs`: `5bdc2b760d79bbc2d0edac85f2a70d6c3435d8a435a8ae4aae9ebb9411443b8a`
- `qualify-render-kernel-texture-repair.mjs`: `e143e5ac3ba8a8a66325199c9c153db2a7077dc591f88e221540467ea2d25fb0`
- `run-render-kernel-texture-repair.mjs`: `ef94f96a091fd7c8110614c67349e1d00ca314b7537032c339b4b45a2db73bb7`
- `cloud-render-kernel-display-witness-repair-declaration.md`: `e15d94f052d46a0db43924bf89bb0336e4756af0b1b6dd689bfaf60606843b71`

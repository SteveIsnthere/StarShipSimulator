# Cloud backend and worker inventory

Read-only inventory on 2026-10-04 following the one declared launch trace. No browser, bench, dependency install, production graphics change, or driver configuration was performed. Existing budgets, sample counts, viewports and retries remain unchanged.

## Installed execution path

Managed Playwright Chromium and headless shell both use revision `1234`, version `151.0.7922.34`. Full Chromium lives in `chromium-1234/chrome-linux64/chrome`; the helper recognizes only the older `chrome-linux/chrome` Linux layout. The diagnostic launch receipt omits `executablePath`, so headless Playwright selects its managed headless shell. This layout gap is a concrete portability repair candidate, but changing executable changes browser implementation and must be declared separately from a worker trial.

Observed launch policy remains `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; the world canvas actually reported WebGL2/SwiftShader. No vsync or frame-cap changes are proposed.

## Visible CPU and driver resources

The cgroup permits `400000 100000` (four core-seconds per second), effective cpuset `0-4` exposes five CPUs, and current process affinity permits all five. `sysconf(_SC_NPROCESSORS_ONLN)` returns five. `taskset` is installed. This agrees with the preceding trace evidence of software GPU waits and frequent quota throttling; it does not establish every browser worker's affinity or count.

No `/dev/dri`, visible NVIDIA devices, or system Vulkan ICD manifests were found. A Vulkan loader, Mesa EGL vendor loader and DRI dispatch libraries exist, but no installed Mesa Vulkan/lavapipe ICD was found. Both managed browser bundles contain `libvk_swiftshader.so`, `libEGL.so`, `libGLESv2.so`, and `vk_swiftshader_icd.json`. The bundled ICD names `./libvk_swiftshader.so` and API `1.0.5`. The presence of generic Mesa libraries does not establish a usable accelerated or alternative Vulkan backend.

## Official supported worker configuration

Chromium version `151.0.7922.34` [DEPS](https://chromium.googlesource.com/chromium/src/+/151.0.7922.34/DEPS) pins SwiftShader `5b0479bd2d15058aaa9eb490e364f920ff824a8c`. Its [RuntimeConfiguration.md](https://github.com/google/swiftshader/blob/5b0479bd2d15058aaa9eb490e364f920ff824a8c/docs/RuntimeConfiguration.md) explicitly documents a case-sensitive `SwiftShader.ini` read from the process working directory, including:

```ini
[Processor]
ThreadCount=4
AffinityMask=0xf
```

Pinned `src/System/SwiftConfig.cpp` reads these fields, defaults ThreadCount to `min(marl::Thread::numLogicalCPUs(),16)`, and installs the worker affinity policy. Pinned `third_party/marl/src/thread.cpp` implements Linux numLogicalCPUs with `sysconf(_SC_NPROCESSORS_ONLN)`, while obtaining affinity separately. Therefore taskset with CPUs `0-3` alone does not prove worker count falls from five to four. `ThreadCount=4` is an officially supported driver configuration candidate, not an invented Chromium flag or rendering simplification.

A bounded future worker diagnostic should retain the current executable, flags, production loop and scene. Before interpreting results it must verify the GPU process cwd, configuration file visibility, named `Thread<xx>` workers and their affinity, and save the exact configuration digest together with cgroup deltas and browser/source/build identity. Browser sandbox filesystem behavior may prevent this configuration from being read; no success is claimed. Whole-process affinity and explicit worker count should not be silently bundled with the full-Chrome layout repair. Four software workers also share the quota with browser/compositor and other tasks, so this correction cannot guarantee a passing budget.

Raw official files, URL/SHA256 provenance and current environment facts are preserved in `cloud-backend-inventory-artifacts/`. No env dump or credentials were collected. Native GPU availability remains absent; this is supported software rendering evidence only.

## Vulkan applicability verified

This configuration is not inferred solely from documentation. Pinned `src/Vulkan/libVulkan.cpp` includes `System/SwiftConfig.hpp` at line 51. Its `vkCreateDevice` path calls `getOrCreateScheduler()` at line 1302; that function calls `sw::getConfiguration()` and `sw::getSchedulerConfiguration(config)` at lines 130–131 before constructing the shared marl scheduler. Thus the current Vulkan driver used underneath ANGLE has the configuration path. The actual bundled headless-shell `libvk_swiftshader.so` contains `SwiftShader.ini`, `Processor`, `ThreadCount`, `AffinityMask`, `AffinityPolicy`, and `Thread<%.2d>` strings. These static facts establish applicability, not successful configuration loading inside the browser sandbox. The raw pinned Vulkan source is added to the provenance manifest.

## Separate minimal browser-layout correction candidate

The proposed code change is one additional discovery layout entry, `['chrome-linux64', 'chrome']`, alongside the existing Linux entry in `tests/e2e/chromium.ts`. Preserve the managed revision selection, legacy layouts, Metal/SwiftShader policy, args, viewports, tests and budgets. Do not combine this change with the worker setting or an alternative renderer. This inventory has not edited that file.

Functional preflight contract before a browser experiment: assert selected path is the installed `chromium-1234/chrome-linux64/chrome`, executable and exactly the managed revision; preserve source/build pin and existing launch policy. A single separately declared nonacceptance preflight should observe actual browser version and command implementation, world-canvas backend, canvas/context identity, browser GPU process working directory, loaded SwiftShader library identity, per-thread names/affinity and cgroup quota. Check representative real production draws and absence of context/probe errors; do not infer successful renderer startup merely from process launch. Save artifacts even on failure. No fps conclusion, acceptance run, retries, relaxed budgets or vsync/frame-cap flags belong in that preflight. If the browser-layout repair and later driver worker correction are each tested, preserve separate declarations/receipts so effects remain distinguishable.

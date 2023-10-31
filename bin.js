#!/usr/bin/env node

// This file exists for ESM-CJ interop and being able to run as a bin script from node_modules.
(async () => {
  await import("./lib/cli.mjs");
})();

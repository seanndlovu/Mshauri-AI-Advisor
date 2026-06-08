---
name: OpenAPI YAML duplicate-key gotcha
description: Orval codegen "Failed to resolve input" is caused by duplicate YAML mapping keys, not file path issues.
---

## The rule
When orval reports `Failed to resolve input: Please provide a valid string value or pass a loader to process the input`, the first thing to check is **duplicate YAML mapping keys** — NOT file path issues.

**Why:** js-yaml (used by orval) silently chokes on duplicate keys. The error message is misleading; it sounds like a file-not-found problem but is actually a YAML parse failure.

**How to detect:** Run:
```
node -e "
const yaml = require('/home/runner/workspace/node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml');
try { yaml.load(require('fs').readFileSync('lib/api-spec/openapi.yaml','utf8')); console.log('ok'); }
catch(e) { console.error('ERROR at line', e.mark?.line, ':', e.message); }
"
```

**How to apply:** After any automated edit to `lib/api-spec/openapi.yaml` (Python scripts, sed, etc.), always run this validation before attempting codegen. The `tags:` block is a common injection point for duplicate `description:` keys.

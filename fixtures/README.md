# fixtures/

Test files used by the E2E and API specs.

- `generated/` — created automatically at test run time by `utils/testFiles.ts`
  (valid CVs, oversized CVs, invalid file types). This folder is gitignored;
  nothing here needs to be committed.
- Drop any real, static sample CVs you want to reuse across runs directly in
  this folder (e.g. `real-sample-cv.pdf`) and reference them with
  `path.join(__dirname, '..', 'fixtures', 'real-sample-cv.pdf')` from a spec.

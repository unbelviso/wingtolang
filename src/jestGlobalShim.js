// jest-canvas-mock (a devDependency, see setupTests.js) references the bare `jest`
// global that real Jest auto-injects but Vitest does not provide. The package's own
// source (grepped across node_modules/jest-canvas-mock/lib) calls exactly two methods
// on it: `jest.fn` and `jest.isMockFunction` -- nothing else (no jest.spyOn/jest.mock/etc).
// Vitest's `vi` implements matching semantics for both (verified empirically:
// vi.isMockFunction(vi.fn()) === true, vi.isMockFunction(plainFn) === false), so this
// shim maps only those two methods, and only for the duration of the test run.
//
// This must run as its own module (rather than a plain statement inline in
// setupTests.js before `import 'jest-canvas-mock'`) because static imports are
// hoisted ahead of ordinary statements under Vite's module transform -- a plain
// assignment placed textually before an import still executes after it. Splitting
// the assignment into its own imported module sidesteps that: evaluation order
// between multiple imports in one file is spec-guaranteed to follow the order they're
// written in, so importing this file before 'jest-canvas-mock' guarantees the shim is
// in place first.
import { vi } from 'vitest';

globalThis.jest = { fn: vi.fn, isMockFunction: vi.isMockFunction };

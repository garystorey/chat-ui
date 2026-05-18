// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

const walkSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return walkSourceFiles(fullPath);
    }
    return SOURCE_EXTENSIONS.includes(extname(fullPath)) ? [fullPath] : [];
  });

const resolveRelativeModule = (
  importer: string,
  specifier: string,
  sourceFiles: Set<string>,
) => {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const basePath = normalize(resolve(dirname(importer), specifier));
  const candidates = [
    basePath,
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => sourceFiles.has(candidate)) ?? null;
};

const getRuntimeDependencies = (filePath: string, sourceFiles: Set<string>) => {
  const source = readFileSync(filePath, "utf8");
  const dependencies = new Set<string>();
  const importPattern =
    /\bimport\s+(?!type\b)[\s\S]*?\sfrom\s*["']([^"']+)["']|\bexport\s+(?!type\b)(?:\*|\{[\s\S]*?\})\s+from\s*["']([^"']+)["']/g;

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    const dependency = resolveRelativeModule(filePath, specifier, sourceFiles);
    if (dependency) {
      dependencies.add(dependency);
    }
  }

  return [...dependencies];
};

const formatCycle = (cycle: string[]) =>
  cycle
    .map((filePath) => relative(SOURCE_ROOT, filePath).replace(/\\/g, "/"))
    .join(" -> ");

const findRuntimeCycles = () => {
  expect(existsSync(SOURCE_ROOT)).toBe(true);

  const files = walkSourceFiles(SOURCE_ROOT);
  const fileSet = new Set(files.map((filePath) => normalize(filePath)));
  const graph = new Map(
    [...fileSet].map((filePath) => [
      filePath,
      getRuntimeDependencies(filePath, fileSet),
    ]),
  );

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (filePath: string) => {
    if (visiting.has(filePath)) {
      const cycleStart = stack.indexOf(filePath);
      cycles.push([...stack.slice(cycleStart), filePath]);
      return;
    }

    if (visited.has(filePath)) {
      return;
    }

    visiting.add(filePath);
    stack.push(filePath);

    for (const dependency of graph.get(filePath) ?? []) {
      visit(dependency);
    }

    stack.pop();
    visiting.delete(filePath);
    visited.add(filePath);
  };

  for (const filePath of fileSet) {
    visit(filePath);
  }

  return cycles;
};

describe("module dependency graph", () => {
  it("does not contain runtime import cycles", () => {
    expect(findRuntimeCycles().map(formatCycle)).toEqual([]);
  });
});

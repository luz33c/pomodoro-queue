// Codex PostToolUse hook: run oxfmt on the files an edit just wrote.
// apply_patch reports the patch text in tool_input.command, so the file paths come from its
// "*** Add File:", "*** Update File:", and "*** Move to:" headers. Paths outside this repository
// are skipped, and oxfmt skips its own ignored paths. The hook never fails the tool call.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
  const toolInput = input.tool_input ?? {};
  const paths = [];

  if (typeof toolInput.file_path === "string") paths.push(toolInput.file_path);
  if (typeof toolInput.command === "string") {
    const header = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm;
    for (const match of toolInput.command.matchAll(header)) paths.push(match[1].trim());
  }

  const files = [...new Set(paths.map((path) => resolve(cwd, path)))].filter((file) => {
    const fromRoot = relative(root, file);
    return fromRoot && !fromRoot.startsWith("..") && !isAbsolute(fromRoot) && existsSync(file);
  });

  if (files.length > 0) {
    execFileSync(
      resolve(root, "node_modules/.bin/oxfmt"),
      ["--no-error-on-unmatched-pattern", ...files],
      { cwd: root, stdio: "ignore" }
    );
  }
} catch {
  // Formatting is best effort; a failure here must not block the agent.
}

import type { ScriptHandlerFn } from "../engine/scripting/ScriptRunner";

/**
 * Compiles a raw script body string into an async handler function using a
 * Blob URL + dynamic import(). This avoids new AsyncFunction() / eval(), so
 * it does not require 'unsafe-eval' in the CSP script-src directive.
 *
 * REQUIRES: 'blob:' in Tauri's script-src CSP. In tauri.conf.json set:
 *   "csp": "default-src 'self'; script-src 'self' blob:; ..."
 * See docs/TAURI_INTEGRATION_HANDOFF.md Section 8 for the full CSP string.
 *
 * NOTE: For syntax checking only, use validateScriptBodiesAsync() from
 * validateProject.ts instead — it uses acorn and has zero CSP requirements.
 */
export async function compileRawScript(
  name: string,
  body: string
): Promise<ScriptHandlerFn> {
  const src = `export default async function(ctx){\n${body}\n}`;
  const blob = new Blob([src], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    const mod = await import(/* @vite-ignore */ url);
    return mod.default as ScriptHandlerFn;
  } catch (e) {
    throw new Error(
      `Failed to compile script "${name}": ${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

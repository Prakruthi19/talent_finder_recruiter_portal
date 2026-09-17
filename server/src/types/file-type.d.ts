// file-type@22 is ESM-only with an "exports" map that TypeScript's legacy
// `moduleResolution: "node"` can't resolve. We only ever reach it via a
// dynamic import() (see lib/fileTypeCheck.ts), which Node resolves fine at
// runtime regardless — this just gives that dynamic import a type.
declare module "file-type" {
  export function fileTypeFromBuffer(
    buffer: Uint8Array | ArrayBuffer
  ): Promise<{ ext: string; mime: string } | undefined>;
}

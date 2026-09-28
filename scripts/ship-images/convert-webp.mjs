import { execFileSync } from "node:child_process";

// Encodes a source image as a square lossy webp via ffmpeg, overwriting the target.
export function convertToWebp(sourcePath, targetPath, size) {
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    sourcePath,
    "-vf",
    `scale=${size}:${size}:flags=lanczos`,
    "-q:v",
    "80",
    targetPath,
  ]);
}

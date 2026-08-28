export const PROFILE_TEXT_HEADER = "# gunner v1" as const;

export function stripCarriageReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

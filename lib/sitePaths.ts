export function withPublicBasePath(path: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  if (!path.startsWith("/") || !basePath) return path;
  const normalizedBase = basePath.replace(/\/$/, "");
  if (path === normalizedBase || path.startsWith(`${normalizedBase}/`)) return path;
  return `${normalizedBase}${path}`;
}

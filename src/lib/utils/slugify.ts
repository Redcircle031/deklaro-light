export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function ensureTenantSlug(name: string, existingSlugs: string[] = []) {
  const baseSlug = slugify(name);
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let candidate = `${baseSlug}-${counter}`;
  while (existingSlugs.includes(candidate)) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
  return candidate;
}

export interface ProductImageAssignment {
  id: string;
  category: string;
  image_url?: string | null;
}

export function resolveProductImageSource(
  product: ProductImageAssignment,
  catalog: readonly ProductImageAssignment[],
): string | null {
  const source = product.image_url?.trim();
  if (!source) return null;

  const isSharedAcrossCategories = catalog.some((candidate) =>
    candidate.id !== product.id
    && candidate.category !== product.category
    && candidate.image_url?.trim() === source,
  );

  return isSharedAcrossCategories ? null : source;
}

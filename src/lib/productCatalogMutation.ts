export async function refreshProductCatalogAfterMutation<T>(
  mutate: () => Promise<T>,
  refresh: () => Promise<void>,
): Promise<void> {
  await mutate();
  await refresh();
}

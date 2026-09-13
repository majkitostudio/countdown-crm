export function shouldCloseMobileNavigationOnKey(
  key: string,
  isMobileViewport: boolean,
  isMobileNavigationOpen: boolean,
) {
  return key === "Escape" && isMobileViewport && isMobileNavigationOpen;
}

export function resetApplication() {
  localStorage.clear();

  sessionStorage.clear();

  window.location.reload();
}

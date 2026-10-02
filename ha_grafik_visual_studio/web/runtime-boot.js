// Hide embedded surfaces before the editor shell can paint while project data loads.
if (new URLSearchParams(location.search).get("embedded") === "1") {
  document.documentElement.classList.add("embedded-loading");
}

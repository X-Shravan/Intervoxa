// Shared responsive navigation used by all Task 2 pages.
const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primaryNavigation");

menuToggle?.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  primaryNavigation?.classList.toggle("is-open");
});

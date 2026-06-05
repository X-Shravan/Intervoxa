// Shared responsive navigation used by all Intervoxa pages.
const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primaryNavigation");

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  primaryNavigation?.classList.remove("is-open");
}

menuToggle?.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  primaryNavigation?.classList.toggle("is-open");
});

primaryNavigation?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    closeMenu();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 768) {
    closeMenu();
  }
});

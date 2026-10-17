export const THEME_KEY = "bdim-theme";

/**
 * Runs in <head> before first paint: applies the saved theme, or the
 * device preference when nothing is saved, so pages never flash white.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

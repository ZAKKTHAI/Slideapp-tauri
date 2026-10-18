import $ from "jquery";

declare global {
  interface Window {
    jQuery: typeof $;
    $: typeof $;
  }
}

window.jQuery = $;
window.$ = $;

await import("slick-carousel");
await import("owl.carousel");

export default $;

/**
 * Empty stand-in for jsPDF's OPTIONAL raster dependencies (html2canvas,
 * dompurify, canvg). They are only reachable through `doc.html()` — the
 * screenshot-to-canvas path this project deliberately never uses. Aliasing them
 * here keeps them out of the bundle entirely, so the output is provably
 * raster-free and smaller.
 */
export default {};

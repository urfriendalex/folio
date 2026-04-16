/** Same hash resolution as the primary nav: on `/` use in-page anchors; elsewhere go home with hash. */
export function getAnchor(pathname: string, id: "work" | "contact") {
  return pathname === "/" ? `#${id}` : `/#${id}`;
}

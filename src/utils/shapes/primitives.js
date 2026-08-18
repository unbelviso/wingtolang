export function drawCircle(rc, cx, cy, r, options) {
  rc.circle(cx, cy, r * 2, options);
}

export function drawTriangle(rc, points, options) {
  rc.polygon(points, options);
}

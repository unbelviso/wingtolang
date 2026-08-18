export const BASE_OPTIONS = {
  // A restrained handwritten wobble: forms and attachment points remain
  // stable, while straight segments no longer feel mechanically rigid.
  // Keep a small handmade feel without making thin symbols look fuzzy.
  roughness: 0.30,
  bowing: 0.28,
  disableMultiStroke: true,
  disableMultiStrokeFill: true,
  preserveVertices: true,
  stroke: '#4A4A4A',
  strokeWidth: 2.2,
};

export const OCCLUDE_OPTIONS = {
  ...BASE_OPTIONS,
  fill: 'white',
  fillStyle: 'solid',
};

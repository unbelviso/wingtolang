// Decorative canvas backgrounds, drawn first so they're baked into the PNG
// export too (not just a CSS backdrop). Each `draw` paints directly onto the
// 2D context; `transparent` paints nothing, leaving the export's alpha
// channel untouched.
const PASTEL = {
  pink: '#FFE1EC',
  sky: '#DCF0FA',
  pinkDark: '#FFB3D1',
  skyDark: '#A8DDF0',
};

export const TINT_COLORS = [PASTEL.pink, PASTEL.sky, PASTEL.pinkDark, PASTEL.skyDark];

function fill(ctx, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

function drawDots(ctx, width, height, dotColor) {
  const step = 34;
  ctx.fillStyle = dotColor;
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRuledLines(ctx, width, height, lineColor) {
  const step = 30;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.4;
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export const BACKGROUND_STYLES = {
  transparent: {
    label: '투명',
    preview: null,
    usesTint: false,
    draw() {},
  },
  white: {
    label: '흰색',
    preview: '#FFFFFF',
    usesTint: false,
    draw: (ctx, w, h) => fill(ctx, w, h, '#FFFFFF'),
  },
  paper: {
    label: '종이',
    preview: '#FFFBF2',
    usesTint: false,
    draw: (ctx, w, h) => fill(ctx, w, h, '#FFFBF2'),
  },
  sticker: {
    label: '스티커',
    preview: PASTEL.pink,
    usesTint: true,
    draw(ctx, w, h, tint = PASTEL.pink) {
      fill(ctx, w, h, '#FFFFFF');
      drawDots(ctx, w, h, tint);
    },
  },
  letter: {
    label: '편지지',
    preview: PASTEL.sky,
    usesTint: true,
    draw(ctx, w, h, tint = PASTEL.sky) {
      fill(ctx, w, h, '#FFFFFF');
      drawRuledLines(ctx, w, h, tint);
    },
  },
  custom: {
    label: '직접 색',
    preview: null,
    usesTint: false,
    draw(ctx, w, h, _tint, customColor = '#FFF7DF') {
      fill(ctx, w, h, customColor);
    },
  },
};

export const DEFAULT_BACKGROUND = 'transparent';

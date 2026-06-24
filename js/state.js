export const state = {
  photos: [],
  cells: [],
  cols: 5,
  rows: 10,
  gap: 4,
  pad: 12,
  orient: 'portrait',
  posterWidth: null,
  posterHeight: null,
  activePreset: 'classic',
  presetId: null,
  posterScale: 1,
  selectedCell: -1,

  zm: {
    cellIdx: -1,
    imgW: 0, imgH: 0,
    cellW: 0, cellH: 0,
    baseScale: 0,
    scale: 1,
    ox: 0, oy: 0,
    containerW: 0, containerH: 0,
    displayRatio: 0,
    ox_disp: 0, oy_disp: 0,
  },

  drag: {
    active: false,
    startX: 0, startY: 0,
    origOx: 0, origOy: 0,
  },
};

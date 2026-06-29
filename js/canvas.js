import { state } from './state.js?v=6';

export function setPosterScale(s) {
  state.posterScale = Math.max(0.2, Math.min(3, s));
  document.getElementById('poster').style.transform =
    `scale(${state.posterScale})`;
  const zoomLabel = document.getElementById('zoomLabel');
  if (zoomLabel) zoomLabel.textContent = Math.round(state.posterScale * 100) + '%';
}

export function zoomIn()  { setPosterScale(state.posterScale + 0.1); }
export function zoomOut() { setPosterScale(state.posterScale - 0.1); }

export function fitPoster() {
  const scroll = document.getElementById('canvasScroll');
  const poster = document.getElementById('poster');
  const style   = getComputedStyle(scroll);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop)  + parseFloat(style.paddingBottom);
  const sw = scroll.clientWidth  - padX;
  const sh = scroll.clientHeight - padY;
  const pw = poster.offsetWidth;
  const ph = poster.offsetHeight;
  setPosterScale(Math.min(sw / pw, sh / ph, 1));
}

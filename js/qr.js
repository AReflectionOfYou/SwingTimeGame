// Builds a QR code as an SVG element, using the vendored qrcode-generator
// library (js/vendor/qrcode.js, MIT). Dark modules on white with a quiet
// zone, which phone cameras read most reliably.
function makeQrSvg(text, { margin = 3, label = '' } = {}) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = count + margin * 2;
  let path = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) path += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
    }
  }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  if (label) svg.setAttribute('aria-label', label);
  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('width', size);
  bg.setAttribute('height', size);
  bg.setAttribute('fill', '#ffffff');
  const fg = document.createElementNS(ns, 'path');
  fg.setAttribute('d', path);
  fg.setAttribute('fill', '#000000');
  svg.appendChild(bg);
  svg.appendChild(fg);
  return svg;
}

// Muxer MP4 mínimo (moov delante = "faststart") para una pista H.264 y una AAC.
// Las muestras vienen de WebCodecs (VideoEncoder con avc.format = 'avc', AudioEncoder 'mp4a.40.2').

class W {
  constructor() { this.parts = []; this.len = 0; }
  u8(v) { this.bytes([v & 255]); }
  u16(v) { this.bytes([(v >>> 8) & 255, v & 255]); }
  u24(v) { this.bytes([(v >>> 16) & 255, (v >>> 8) & 255, v & 255]); }
  u32(v) { this.bytes([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); }
  i16(v) { this.u16(v < 0 ? v + 65536 : v); }
  str(s) { this.bytes([...s].map(c => c.charCodeAt(0))); }
  zeros(n) { this.bytes(new Uint8Array(n)); }
  bytes(b) { const a = b instanceof Uint8Array ? b : Uint8Array.from(b); this.parts.push(a); this.len += a.length; }
  out() { const o = new Uint8Array(this.len); let p = 0; for (const a of this.parts) { o.set(a, p); p += a.length; } return o; }
}

function box(type, ...children) {
  const w = new W();
  let size = 8; for (const c of children) size += c.length;
  w.u32(size); w.str(type); for (const c of children) w.bytes(c);
  return w.out();
}
function full(type, version, flags, body) {
  const w = new W(); w.u8(version); w.u24(flags); w.bytes(body);
  return box(type, w.out());
}
const bw = f => { const w = new W(); f(w); return w.out(); };
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

function descr(tag, body) { // descriptor MPEG-4 con longitud de 4 bytes (lo aceptan todos los lectores)
  const w = new W(); w.u8(tag);
  const n = body.length; w.u8(0x80 | ((n >>> 21) & 127)); w.u8(0x80 | ((n >>> 14) & 127)); w.u8(0x80 | ((n >>> 7) & 127)); w.u8(n & 127);
  w.bytes(body); return w.out();
}

function stblCommon(samples, delta, offsets) {
  const stts = full('stts', 0, 0, bw(w => { w.u32(1); w.u32(samples.length); w.u32(delta); }));
  const stsc = full('stsc', 0, 0, bw(w => { w.u32(1); w.u32(1); w.u32(1); w.u32(1); }));
  const stsz = full('stsz', 0, 0, bw(w => { w.u32(0); w.u32(samples.length); for (const s of samples) w.u32(s.data.length); }));
  const stco = full('stco', 0, 0, bw(w => { w.u32(offsets.length); for (const o of offsets) w.u32(o); }));
  return { stts, stsc, stsz, stco };
}

function tkhd(id, durMovie, w_, h_, audio) {
  return full('tkhd', 0, 3, bw(w => {
    w.u32(0); w.u32(0); w.u32(id); w.u32(0); w.u32(durMovie); w.zeros(8);
    w.u16(0); w.u16(audio ? 1 : 0); w.u16(audio ? 0x0100 : 0); w.u16(0);
    MATRIX.forEach(m => w.u32(m)); w.u32(w_ << 16); w.u32(h_ << 16);
  }));
}
function mdhd(ts, dur) { return full('mdhd', 0, 0, bw(w => { w.u32(0); w.u32(0); w.u32(ts); w.u32(dur); w.u16(0x55c4); w.u16(0); })); }
function hdlr(type, name) { return full('hdlr', 0, 0, bw(w => { w.u32(0); w.str(type); w.zeros(12); w.str(name); w.u8(0); })); }
const dinf = () => box('dinf', full('dref', 0, 0, bw(w => { w.u32(1); w.bytes(full('url ', 0, 1, new Uint8Array(0))); })));

/**
 * @param v {width,height,timescale,delta,avcC:Uint8Array,samples:[{data,key}]}
 * @param a {sampleRate,channels,asc:Uint8Array,samples:[{data}],bitrate} | null
 */
export function muxMP4(v, a) {
  const MOVIE_TS = 1000;
  // orden de escritura en mdat: intercalado por tiempo (cada muestra es su propio chunk)
  const order = [];
  v.samples.forEach((s, i) => order.push({ t: (i * v.delta) / v.timescale, tr: 0, i }));
  if (a) a.samples.forEach((s, i) => order.push({ t: (i * 1024) / a.sampleRate, tr: 1, i }));
  order.sort((x, y) => x.t - y.t || x.tr - y.tr);

  const vDur = v.samples.length * v.delta, aDur = a ? a.samples.length * 1024 : 0;
  const vDurM = Math.round((vDur / v.timescale) * MOVIE_TS), aDurM = a ? Math.round((aDur / a.sampleRate) * MOVIE_TS) : 0;

  const build = (vOff, aOff) => {
    const vt = stblCommon(v.samples, v.delta, vOff);
    const stss = full('stss', 0, 0, bw(w => { const k = v.samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean); w.u32(k.length); k.forEach(x => w.u32(x)); }));
    const avc1 = box('avc1', bw(w => {
      w.zeros(6); w.u16(1); w.u16(0); w.u16(0); w.zeros(12); w.u16(v.width); w.u16(v.height);
      w.u32(0x00480000); w.u32(0x00480000); w.u32(0); w.u16(1);
      const name = 'BidVerse promo'; w.u8(name.length); w.str(name); w.zeros(31 - name.length);
      w.u16(0x0018); w.i16(-1);
    }), box('avcC', v.avcC), box('pasp', bw(w => { w.u32(1); w.u32(1); })));
    const vstsd = full('stsd', 0, 0, bw(w => { w.u32(1); w.bytes(avc1); }));
    const vtrak = box('trak', tkhd(1, vDurM, v.width, v.height, false), box('mdia', mdhd(v.timescale, vDur), hdlr('vide', 'VideoHandler'),
      box('minf', full('vmhd', 0, 1, bw(w => { w.u16(0); w.u16(0); w.u16(0); w.u16(0); })), dinf(),
        box('stbl', vstsd, vt.stts, stss, vt.stsc, vt.stsz, vt.stco))));
    const traks = [vtrak];
    if (a) {
      const at = stblCommon(a.samples, 1024, aOff);
      const dcd = descr(0x04, bw(w => {
        w.u8(0x40); w.u8(0x15); w.u24(0); w.u32(a.bitrate); w.u32(a.bitrate);
        w.bytes(descr(0x05, a.asc));
      }));
      const esd = descr(0x03, bw(w => { w.u16(2); w.u8(0); w.bytes(dcd); w.bytes(descr(0x06, Uint8Array.of(2))); }));
      const mp4a = box('mp4a', bw(w => {
        w.zeros(6); w.u16(1); w.zeros(8); w.u16(a.channels); w.u16(16); w.u16(0); w.u16(0); w.u32(a.sampleRate * 65536 >>> 0);
      }), full('esds', 0, 0, esd));
      const astsd = full('stsd', 0, 0, bw(w => { w.u32(1); w.bytes(mp4a); }));
      traks.push(box('trak', tkhd(2, aDurM, 0, 0, true), box('mdia', mdhd(a.sampleRate, aDur), hdlr('soun', 'SoundHandler'),
        box('minf', full('smhd', 0, 0, bw(w => { w.u16(0); w.u16(0); })), dinf(),
          box('stbl', astsd, at.stts, at.stsc, at.stsz, at.stco)))));
    }
    const mvhd = full('mvhd', 0, 0, bw(w => {
      w.u32(0); w.u32(0); w.u32(MOVIE_TS); w.u32(Math.max(vDurM, aDurM)); w.u32(0x00010000); w.u16(0x0100); w.zeros(10);
      MATRIX.forEach(m => w.u32(m)); w.zeros(24); w.u32(a ? 3 : 2);
    }));
    return box('moov', mvhd, ...traks);
  };

  const ftyp = box('ftyp', bw(w => { w.str('isom'); w.u32(0x200); w.str('isom'); w.str('iso2'); w.str('avc1'); w.str('mp41'); }));
  // primera pasada con offsets falsos para medir el moov (su tamaño no depende de los valores)
  const vOff = new Array(v.samples.length).fill(0), aOff = a ? new Array(a.samples.length).fill(0) : [];
  const moovSize = build(vOff, aOff).length;
  let pos = ftyp.length + moovSize + 8;
  let mdatLen = 0;
  for (const o of order) {
    const s = o.tr === 0 ? v.samples[o.i] : a.samples[o.i];
    (o.tr === 0 ? vOff : aOff)[o.i] = pos; pos += s.data.length; mdatLen += s.data.length;
  }
  const moov = build(vOff, aOff);
  const out = new Uint8Array(ftyp.length + moov.length + 8 + mdatLen);
  let p = 0;
  out.set(ftyp, p); p += ftyp.length;
  out.set(moov, p); p += moov.length;
  const dv = new DataView(out.buffer);
  dv.setUint32(p, 8 + mdatLen); out.set([109, 100, 97, 116], p + 4); p += 8; // 'mdat'
  for (const o of order) { const s = o.tr === 0 ? v.samples[o.i] : a.samples[o.i]; out.set(s.data, p); p += s.data.length; }
  return out;
}

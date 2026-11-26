// Exportación genérica a MP4 (WebCodecs + muxer propio): frame(t) dibuja en `canvas`, audio es un AudioBuffer opcional.
import { muxMP4 } from './mp4.js';

export async function exportMP4({ canvas, frame, dur, fps = 30, audio = null, name = 'out.mp4', bitrate = 10e6, hw = 'prefer-hardware' }) {
  const W = canvas.width, H = canvas.height, t0 = performance.now();
  const vSamples = []; let avcC = null, lastTs = -1, reorder = false;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description);
      if (chunk.timestamp < lastTs) reorder = true; lastTs = chunk.timestamp;
      const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); vSamples.push({ data: b, key: chunk.type === 'key' });
    },
    error: e => { throw e; },
  });
  enc.configure({ codec: 'avc1.640033', width: W, height: H, bitrate, framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality', bitrateMode: 'variable', hardwareAcceleration: hw });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await frame(i / fps);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
    while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 2));
    if (i % 60 === 0) console.log(`frame ${i}/${n} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  }
  await enc.flush(); enc.close();
  let a = null;
  if (audio) {
    const aS = []; let asc = null;
    const ae = new AudioEncoder({ output: (c, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description && !asc) asc = new Uint8Array(meta.decoderConfig.description); const b = new Uint8Array(c.byteLength); c.copyTo(b); aS.push({ data: b }); }, error: e => { throw e; } });
    ae.configure({ codec: 'mp4a.40.2', sampleRate: audio.sampleRate, numberOfChannels: 2, bitrate: 192000 });
    const L = audio.getChannelData(0), R = audio.getChannelData(audio.numberOfChannels > 1 ? 1 : 0), end = Math.min(audio.length, Math.round(dur * audio.sampleRate)), CH = 4800;
    for (let s = 0; s < end; s += CH) {
      const len = Math.min(CH, end - s), data = new Float32Array(len * 2);
      data.set(L.subarray(s, s + len), 0); data.set(R.subarray(s, s + len), len);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: audio.sampleRate, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((s / audio.sampleRate) * 1e6), data });
      ae.encode(ad); ad.close();
    }
    await ae.flush(); ae.close();
    a = { sampleRate: audio.sampleRate, channels: 2, asc: asc || Uint8Array.of(0x11, 0x90), samples: aS, bitrate: 192000 };
  }
  const mp4 = muxMP4({ width: W, height: H, timescale: 90000, delta: 90000 / fps, avcC, samples: vSamples }, a);
  await fetch('/__save?f=' + encodeURIComponent(name), { method: 'POST', body: mp4 });
  return { frames: n, bytes: mp4.length, secs: (performance.now() - t0) / 1000, reorder, audioChunks: a ? a.samples.length : 0 };
}

// Director del spot: planos, cámaras, animación de los muñecos, composición 2D, previsualización y exportación a MP4.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeToy, pose, SIT, STAND } from './toys.js';
import { livingRoom, bedroom, studio, makePhone } from './sets.js';
import { createUI, T as UT } from './ui.js';
import { renderSoundtrack, LINES } from './audio.js';
import { muxMP4 } from './mp4.js';
import { K, E, clamp, prog, lerp, pulse, noise, fbm, rng, TAU } from './util.js';

export const W = 1080, H = 1920, FPS = 30, DUR = 33;
const SITE = new URLSearchParams(location.search).get('site') || 'bidverse-cdiy.onrender.com';

const loadImg = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('no carga ' + src)); i.src = src; });

export async function init(holder) {
  await Promise.all(['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '900 40px Nunito', '800 40px Nunito', '700 40px Nunito', '600 40px Nunito'].map(f => document.fonts.load(f)));
  const IMGS = { logo: 'pics/LogoBidVerse.png', icon: 'pics/logo-icon.png', anime: 'bg/anime.webp', ufc: 'bg/ufc.webp', futbol: 'bg/futbol.jpg',
    Goku: 'pics/Goku.jpg', Sukuna: 'pics/Sukuna.webp', Gojo: 'pics/Gojo.webp', Itachi: 'pics/Itachi.jpg', Naruto: 'pics/Naruto.jpg', Luffy: 'pics/Luffy.jpg' };
  const img = {};
  await Promise.all(Object.entries(IMGS).map(async ([k, v]) => { img[k] = await loadImg('../' + v); }));
  const ui = createUI(img, { site: SITE });

  // ---------- render 3D ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const rpass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.55, 0.9);
  composer.addPass(rpass); composer.addPass(bloom); composer.addPass(new OutputPass());
  let size = [0, 0];
  const setSize = (w, h) => { if (size[0] === w && size[1] === h) return; size = [w, h]; renderer.setSize(w, h, false); composer.setSize(w, h); };
  const pm = new THREE.PMREMGenerator(renderer);
  const envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const iconTex = new THREE.Texture(img.icon); iconTex.colorSpace = THREE.SRGBColorSpace; iconTex.needsUpdate = true;
  const assets = { icon: iconTex };
  const A = livingRoom(assets), B = bedroom(assets), Cs = studio(assets);
  for (const S of [A, B, Cs]) { S.scene.environment = envTex; S.scene.environmentIntensity = 0.4; S.scene.traverse(o => { if (o.isLight) o.layers.enable(1); }); }

  // ---------- muñecos ----------
  const LEO = { skin: '#f1c19c', hair: '#3a2416', top: '#ef4b3f', top2: '#c7352b', pants: '#2b3a55', sole: '#2f8cff', eye: '#4a2c17', hairStyle: 'messy', seed: 7 };
  const DANI = { skin: '#c98d64', hair: '#c4501e', top: '#3d7bf0', top2: '#2a5bc4', pants: '#3b3b46', sole: '#ff3355', eye: '#2a1a10', hairStyle: 'curly', seed: 19 };
  const leo = makeToy(LEO), dani = makeToy(DANI), leoC = makeToy(LEO), daniC = makeToy(DANI);
  A.scene.add(leo.root); B.scene.add(dani.root); Cs.scene.add(leoC.root, daniC.root);
  const both = (R, f) => R.arm.forEach(a => a.el.traverse(o => o.layers.enable(1)));
  both(leo); both(dani);

  // ---------- móviles ----------
  const leoTex = new THREE.CanvasTexture(ui.drawPhone(0, 'leo')); leoTex.colorSpace = THREE.SRGBColorSpace; leoTex.anisotropy = 16;
  const daniTex = new THREE.CanvasTexture(ui.drawPhone(0, 'dani')); daniTex.colorSpace = THREE.SRGBColorSpace; daniTex.anisotropy = 16;
  const PHS = 0.55; // móvil a tamaño real
  const leoPhone = makePhone(leoTex, '#7a3cf0'), daniPhone = makePhone(daniTex, '#ffcf5a');
  leoPhone.traverse(o => o.layers.set(1)); daniPhone.traverse(o => o.layers.set(1));
  A.scene.add(leoPhone); B.scene.add(daniPhone);

  const cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 60);
  const camB = new THREE.PerspectiveCamera(40, 1, 0.02, 60);
  [cam, camB].forEach(c => c.layers.enableAll());

  // ---------- utilidades de pose ----------
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  const headC = R => R.head.localToWorld(R.HC.clone().add(v3(0, 0, 0.02)));
  const eyesC = R => R.head.localToWorld(R.EYE.clone());
  const talk = (t, t0, txt, rate = 0.09) => { // apertura de boca mientras habla (aprox. a las sílabas)
    const n = (txt.match(/[aeiouáéíóú]/gi) || []).length, d = n * rate + 0.1;
    if (t < t0 || t > t0 + d) return 0;
    return 0.25 + 0.55 * Math.abs(Math.sin((t - t0) * Math.PI / rate));
  };
  const blink = (t, times) => { let b = 0; for (const s of times) b = Math.max(b, pulse(t, s, s + 0.16, 0.06, 0.1)); return b; };

  // ================= LEO =================
  function leoPose(t) {
    const p = { ...SIT, x: 0, z: -0.63, hy: -0.29, hz: 0.04, lean: -0.25, breath: Math.sin(t * 1.6) };
    let phone = 'table'; // table | handL | ear | both | none
    let lid = 0.15, look = [0, 0], brow = 0, browTilt = 0, smile = 0.25, open = 0, eyeScale = 1, squint = 0, teeth = 1;
    if (t < 4.45) {
      const k = E.io(prog(t, 0, 3.2));
      p.hz = lerp(0.08, 0.24, k); p.hy = lerp(-0.3, -0.4, k); p.lean = lerp(-0.4, -0.72, k);
      p.thighL = p.thighR = lerp(1.45, 1.22, k); p.kneeL = p.kneeR = lerp(1.4, 1.15, k);
      p.legOutL = 0.2; p.legOutR = 0.28;
      p.nod = lerp(0.3, 0.5, k); p.tilt = lerp(0.18, 0.34, k); p.turn = Math.sin(t * 0.45) * 0.06;
      p.armOutL = 0.55; p.armOutR = 0.6; p.armFwdL = -0.15; p.armFwdR = -0.1; p.elbowL = 0.35; p.elbowR = 0.3;
      lid = 0.55; look = [0.3, 0.45]; brow = -0.35; browTilt = -0.6; smile = -0.3;
      const sg = pulse(t, 1.05, 2.0, 0.12, 0.5); open = sg * 0.42; p.lean -= sg * 0.06; p.nod -= sg * 0.08; lid = lerp(lid, 0.7, sg);
      lid = Math.max(lid, blink(t, [2.4]));
      // plano corto: mira el reloj, suspira, desliza la mirada hasta el móvil
      const look2 = E.ioC(prog(t, 3.0, 3.75));
      look = [lerp(0.3, 0.75, look2), lerp(0.45, -0.75, look2)];
      p.turn += lerp(0, 0.22, look2); p.nod += lerp(0, 0.12, look2);
      // ¡idea!
      const id = prog(t, 3.98, 4.12), id2 = prog(t, 4.12, 4.35);
      if (t > 3.98) {
        eyeScale = 1 + 0.2 * E.outBack(id) - 0.06 * id2; lid = lerp(lid, 0.0, E.outC(id)); brow = lerp(brow, 0.95, E.outBack(id)); browTilt = lerp(browTilt, 0, id);
        open = lerp(open, 0.55, id) * (1 - id2); smile = lerp(smile, 1, id2); p.nod -= 0.2 * E.outBack(id); p.lean += 0.08 * id;
        look = [lerp(look[0], 0.55, id), lerp(look[1], -0.55, id)];
      }
    } else if (t < 6.0) {
      // se incorpora, coge el móvil y llama
      const up = E.outC(prog(t, 4.42, 4.72));
      p.hz = lerp(0.2, 0.08, up); p.hy = lerp(-0.38, -0.29, up); p.lean = lerp(-0.6, 0.22, up);
      p.thighL = p.thighR = lerp(1.22, 1.5, up); p.kneeL = p.kneeR = lerp(1.15, 1.42, up);
      p.nod = lerp(0.2, 0.28, up); p.tilt = lerp(0.3, 0, up); p.turn = lerp(0.22, 0.25, up);
      eyeScale = 1.12; lid = 0; brow = 0.7; smile = 0.95;
      look = [0.5, -0.6];
      const reach = E.ioC(prog(t, 4.55, 4.88)), lift = E.ioC(prog(t, 4.92, 5.18)), ear = E.ioC(prog(t, 5.42, 5.72));
      p.armFwdL = lerp(lerp(-0.15, -1.15, reach), -1.45, lift); p.armOutL = lerp(lerp(0.55, 0.3, reach), 0.05, lift); p.elbowL = lerp(lerp(0.3, 0.35, reach), 1.55, lift);
      p.lean += lerp(0.12 * reach, -0.12, lift);
      p.armOutR = 0.35; p.armFwdR = -0.2; p.elbowR = 0.5;
      if (t > 4.9) phone = 'handL';
      if (t > 4.92) { look = [lerp(0.5, 0.05, lift), lerp(-0.6, -0.35, lift)]; p.turn = lerp(0.25, 0.05, lift); p.nod = lerp(0.28, 0.12, lift); }
      // marca con el pulgar derecho
      const dial = pulse(t, 5.05, 5.45, 0.1, 0.12);
      p.armFwdR = lerp(p.armFwdR, -1.3, dial); p.elbowR = lerp(p.elbowR, 1.45, dial); p.armOutR = lerp(p.armOutR, -0.05, dial);
      if (t > 5.42) { // videollamada: sube el móvil delante de la cara
        p.armFwdL = lerp(p.armFwdL, -1.0, ear); p.armOutL = lerp(p.armOutL, 0.0, ear); p.elbowL = lerp(p.elbowL, 1.05, ear);
        p.tilt = lerp(0, 0.06, ear); p.turn = lerp(0.05, 0.12, ear); p.nod = lerp(0.12, -0.02, ear); p.lean = lerp(p.lean, -0.1, ear);
        look = [lerp(0.05, 0.25, ear), lerp(-0.35, -0.05, ear)];
      }
      // espera impaciente: pie que bate
      p.kneeR += Math.max(0, Math.sin(t * 14)) * 0.15 * prog(t, 5.6, 5.8);
    } else if (t < 10.0) {
      // en videollamada con Dani
      phone = 'handL';
      p.lean = -0.1 + Math.sin(t * 2) * 0.02; p.hz = 0.07;
      p.armFwdL = -1.0; p.armOutL = 0.0; p.elbowL = 1.05;
      p.tilt = 0.06; p.turn = 0.12; p.nod = -0.02;
      p.armOutR = 0.3; p.armFwdR = -0.25; p.elbowR = 0.6;
      eyeScale = 1.05; lid = 0.08; brow = 0.3; smile = 0.7;
      look = [0.25, -0.05];
      p.kneeR += Math.max(0, Math.sin(t * 14)) * 0.15 * (t < UT.answer ? 1 : 0);
      if (t < UT.answer) { look = [0.25 + Math.sin(t * 1.3) * 0.15, 0.0]; smile = 0.5; }
      else { smile = 0.85; }
      const sp = talk(t, LINES.leo1.t, LINES.leo1.text);
      if (sp > 0) { open = sp; smile = 0.6; brow = 0.55; }
      const g = pulse(t, LINES.leo1.t, LINES.leo1.t + 1.2, 0.2, 0.3);
      p.armFwdR = lerp(p.armFwdR, -1.0, g); p.elbowR = lerp(p.elbowR, 1.6, g); p.armOutR = lerp(p.armOutR, 0.45, g); p.wristZR = Math.sin(t * 9) * 0.4 * g;
      if (t > LINES.dani1.t) { p.nod += Math.sin(t * 11) * 0.06 * pulse(t, LINES.dani1.t, LINES.dani1.t + 1.1, 0.1, 0.2); smile = 1; squint = 0.3; brow = 0.8; }
      lid = Math.max(lid, blink(t, [6.6, 8.3]));
      // baja el móvil para mirar la pantalla
      const dn = E.ioC(prog(t, 9.7, 10.0));
      if (dn > 0) {
        p.armFwdL = lerp(p.armFwdL, -0.8, dn); p.armOutL = lerp(p.armOutL, -0.2, dn); p.elbowL = lerp(p.elbowL, 1.6, dn);
        p.armFwdR = lerp(p.armFwdR, -0.8, dn); p.armOutR = lerp(p.armOutR, -0.2, dn); p.elbowR = lerp(p.elbowR, 1.6, dn);
        p.tilt = lerp(p.tilt, 0, dn); p.turn = lerp(p.turn, 0, dn); p.nod = lerp(p.nod, 0.3, dn); look = [0, -0.6];
        if (dn > 0.5) phone = 'both';
      }
    } else if (t < 26.0) {
      // jugando con el móvil en las dos manos
      phone = 'both';
      const intense = prog(t, 14, 14.4);
      p.hz = lerp(0.07, 0.13, intense); p.lean = lerp(0.06, 0.28, intense);
      p.armFwdL = -0.8; p.armOutL = -0.2; p.elbowL = 1.6; p.armFwdR = -0.8; p.armOutR = -0.2; p.elbowR = 1.65;
      p.nod = 0.3; look = [0, -0.55]; lid = 0.05; eyeScale = 1.08; brow = 0.25; smile = 0.55;
      // toques
      const taps = [UT.typeA, UT.typeA + 0.15, UT.typeA + 0.3, UT.typeA + 0.45, UT.go, UT.tapAnime, 14.48, 15.48, 16.4, 16.55, 16.7, 16.85, 16.98];
      let tp = 0; for (const s of taps) tp = Math.max(tp, pulse(t, s - 0.06, s + 0.06, 0.06, 0.06));
      p.elbowR += tp * 0.25; p.wristXR = -tp * 0.4;
      if (t > 15.9 && t < 17.6) { // pique de pujas
        browTilt = 0.75; brow = -0.2; smile = -0.1; eyeScale = 1.15; lid = 0; p.lean = 0.35 + Math.sin(t * 20) * 0.015;
        p.elbowR += Math.abs(Math.sin(t * 24)) * 0.25; p.elbowL += Math.abs(Math.sin(t * 24 + 1)) * 0.1;
        const sh = talk(t, LINES.leo2.t, LINES.leo2.text, 0.12);
        if (sh > 0) { open = 0.5 + sh * 0.5; eyeScale = 1.2; brow = 0.4; browTilt = 0.9; p.nod = 0.15; p.lean = 0.42; }
      }
    } else if (t < 29.0) {
      // ¡victoria! se levanta y salta
      phone = 'none';
      Object.assign(p, STAND); p.z = -0.12; p.hz = 0; p.hy = 0; p.lean = 0;
      const jump = Math.abs(Math.sin((t - 26.0) * Math.PI / 0.42));
      p.y = jump * 0.22 * (t < 27.6 ? 1 : 0.4);
      p.kneeL = p.kneeR = (1 - jump) * 0.5; p.thighL = p.thighR = (1 - jump) * 0.35; p.ankleL = p.ankleR = -(1 - jump) * 0.2;
      p.lean = 0.12 - jump * 0.08;
      p.armOutL = p.armOutR = 2.5 - jump * 0.2; p.armFwdL = p.armFwdR = -0.3; p.elbowL = p.elbowR = 0.3 + jump * 0.2;
      p.nod = -0.15; smile = 1; open = 0.6; squint = 0.75; lid = 0.25; brow = 0.9; teeth = 1;
      const sh = talk(t, LINES.leo3.t, LINES.leo3.text, 0.12); if (sh > 0) open = 0.6 + sh * 0.4;
      if (t > 27.2) { // baile
        const d = Math.sin((t - 27.2) * TAU * 2);
        p.hipRz = d * 0.12; p.side = -d * 0.15; p.tilt = d * 0.15;
        p.armOutL = 0.6 + Math.max(0, d) * 1.9; p.armOutR = 0.6 + Math.max(0, -d) * 1.9; p.elbowL = p.elbowR = 1.2;
        p.armFwdL = p.armFwdR = -0.6;
      }
    }
    Object.assign(p, { lid, look, brow, browTilt, smile, open, eyeScale, squint, teeth });
    return { p, phone };
  }

  // ================= DANI =================
  function daniPose(t) {
    let p, phone = 'above';
    let lid = 0.15, look = [0, 0], brow = 0, browTilt = 0, smile = 0.25, open = 0, eyeScale = 1, squint = 0;
    const RING = 6.2;
    if (t < 16.0) {
      // sentada en la cama, encorvada sobre el móvil; suena, se le escapa por los aires, lo caza y contesta (videollamada)
      p = { ...SIT, x: 0.15, z: -0.38, ry: 0.28, hy: -0.215, lean: 0.32, breath: Math.sin(t * 1.4) };
      p.thighL = p.thighR = 1.45; p.legOutL = p.legOutR = 0.85; p.kneeL = p.kneeR = 2.25; p.ankleL = p.ankleR = 0.4;
      p.armFwdL = p.armFwdR = -0.7; p.armOutL = p.armOutR = -0.2; p.elbowL = p.elbowR = 1.6; p.nod = 0.42; p.tilt = 0.12;
      phone = 'both';
      lid = 0.6; look = [0, -0.4]; brow = -0.35; browTilt = -0.55; smile = -0.25;
      p.wristXR = Math.max(0, Math.sin(t * 5)) * -0.3; // hace scroll
      lid = Math.max(lid, blink(t, [5.0]));
      if (t >= RING) {
        const st = prog(t, RING, RING + 0.12), jmp = pulse(t, RING, RING + 0.5, 0.1, 0.35);
        p.hy += jmp * 0.12; p.lean = lerp(0.32, -0.15, E.outC(st)); p.nod = lerp(0.42, -0.1, E.outC(st));
        eyeScale = 1 + 0.25 * E.outBack(st); lid = 0; brow = 1; browTilt = 0; smile = -0.2; open = 0.55 * jmp;
        // brazos al aire y el móvil sale volando
        const fl = pulse(t, RING, RING + 0.5, 0.08, 0.2);
        p.armFwdL = p.armFwdR = lerp(-1.2, -2.5, fl); p.armOutL = p.armOutR = lerp(-0.02, 0.6, fl); p.elbowL = p.elbowR = lerp(1.3, 0.35, fl);
        phone = t < RING + 0.55 ? 'toss' : 'both';
        if (t > RING + 0.4) { // lo caza
          const c = E.outBack(prog(t, RING + 0.4, RING + 0.6));
          p.armFwdL = p.armFwdR = lerp(-2.1, -0.7, c); p.armOutL = p.armOutR = lerp(0.35, -0.2, c); p.elbowL = p.elbowR = lerp(0.6, 1.6, c);
          p.lean = lerp(-0.15, 0.1, c); p.nod = lerp(-0.1, 0.25, c); look = [0, -0.5]; open = 0; smile = lerp(-0.2, 0.2, c);
        }
      }
      if (t >= UT.answer - 0.1) { // contesta: videollamada, móvil delante de la cara
        const g = E.ioC(prog(t, UT.answer - 0.1, UT.answer + 0.3));
        p.armFwdL = p.armFwdR = lerp(-0.7, -0.85, g); p.elbowL = p.elbowR = lerp(1.6, 1.55, g); p.lean = lerp(0.1, -0.05, g); p.nod = lerp(0.25, 0.0, g);
        look = [0, lerp(-0.5, 0, g)]; smile = lerp(0.2, 0.6, g); lid = 0.08; eyeScale = 1.05; brow = 0.3;
        const ex = pulse(t, LINES.dani1.t - 0.1, LINES.dani1.t + 1.2, 0.15, 0.3);
        smile = lerp(smile, 1, ex); eyeScale = lerp(1.05, 1.18, ex); brow = lerp(0.3, 0.95, ex);
        const sp = talk(t, LINES.dani1.t, LINES.dani1.text); if (sp > 0) open = sp;
        // puño en alto con la derecha mientras sujeta el móvil con la izquierda
        p.armFwdR = lerp(p.armFwdR, -2.2, ex); p.armOutR = lerp(p.armOutR, 0.55, ex); p.elbowR = lerp(p.elbowR, 1.6, ex) + Math.sin(t * 18) * 0.25 * ex;
        if (ex > 0.5) phone = 'handL';
        p.hy += Math.abs(Math.sin(t * 9)) * 0.03 * ex;
        lid = Math.max(lid, blink(t, [8.4]));
      }
    }
    if (t >= 16.0) {
      // sentada en la cama con el móvil, piques y caída de espaldas al perder
      p = { ...SIT, x: 0.15, z: -0.38, ry: 0.28, hy: -0.215, lean: 0.25, breath: Math.sin(t * 2) };
      p.thighL = p.thighR = 1.45; p.legOutL = p.legOutR = 0.85; p.kneeL = p.kneeR = 2.25; p.ankleL = p.ankleR = 0.4;
      p.armFwdL = p.armFwdR = -0.8; p.armOutL = p.armOutR = -0.2; p.elbowL = p.elbowR = 1.6; p.nod = 0.3;
      phone = 'both'; look = [0, -0.5]; lid = 0.05; eyeScale = 1.12; brow = 0.1; browTilt = 0.6; smile = -0.1;
      p.elbowR += Math.abs(Math.sin(t * 22)) * 0.2;
      const sp = talk(t, LINES.dani2.t, LINES.dani2.text, 0.12);
      if (sp > 0) { open = 0.45 + sp * 0.5; eyeScale = 1.2; brow = 0.5; p.lean = 0.35; p.nod = 0.15; }
      if (t > LINES.leo2.t + 0.1 && t < 18) { eyeScale = 1.25; open = 0.6; brow = 1; browTilt = -0.3; smile = -0.6; p.lean = 0.05; } // ¿¡quince!?
      if (t >= 26.0) {
        phone = 'none';
        const fall = E.outBounce(prog(t, 26.0, 26.55)), rise = E.outBack(prog(t, 27.25, 27.55));
        p.lean = lerp(0.25, -1.18, fall) * (1 - rise) + rise * 0.18; p.hy += fall * 0.04 * (1 - rise);
        p.armFwdL = p.armFwdR = lerp(-0.8, -2.6, fall) * (1 - rise) + rise * -1.4;
        p.armOutL = p.armOutR = lerp(0, 1.4, fall) * (1 - rise) + rise * 0.1;
        p.elbowL = p.elbowR = lerp(1.6, 0.2, fall) * (1 - rise) + rise * 0.2;
        p.thighL = p.thighR = 1.45 + fall * 0.4 * (1 - rise);
        lid = 1 - rise * 0.95; squint = 0; open = lerp(0.7, 0, rise); smile = -0.7; brow = -0.5; browTilt = 0; eyeScale = 1;
        p.nod = lerp(0.3, -0.2, fall) * (1 - rise);
        if (rise > 0) { // ¡revancha!: señala a cámara
          p.armFwdR = lerp(-1.4, -1.55, rise); p.armOutR = 0.1; p.elbowR = 0.15; p.armFwdL = -0.3; p.armOutL = 0.5; p.elbowL = 1.8;
          brow = -0.1; browTilt = 1; smile = 0.2; lid = 0.05; eyeScale = 1.15; look = [0, 0.05];
          const s2 = talk(t, LINES.dani3.t, LINES.dani3.text, 0.12); open = s2 > 0 ? 0.5 + s2 * 0.5 : 0.2;
          p.lean = 0.3 + Math.sin(t * 12) * 0.03 * prog(t, 27.5, 27.7); p.nod = 0.05;
        }
      }
    }
    Object.assign(p, { lid, look, brow, browTilt, smile, open, eyeScale, squint });
    return { p, phone };
  }

  // ---------- colocar móviles ----------
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  function placePhone(ph, R, mode, t, table) {
    ph.visible = mode !== 'none';
    if (mode === 'none') return;
    ph.scale.setScalar(PHS);
    if (mode === 'table') { ph.position.copy(table); ph.rotation.set(-Math.PI / 2, 0, 0.35); return; }
    const hL = wp(R.arm[0].hand), hR = wp(R.arm[1].hand), eyes = eyesC(R), hc = headC(R);
    let pos;
    if (mode === 'handL') pos = hL.clone().add(v3(0, 0.035, 0.03).applyQuaternion(R.torso.getWorldQuaternion(q)));
    else if (mode === 'both') pos = hL.clone().add(hR).multiplyScalar(0.5).add(v3(0, 0.05, 0.025).applyQuaternion(R.torso.getWorldQuaternion(q)));
    else if (mode === 'ear') pos = hL.clone().lerp(hc, 0.35);
    else if (mode === 'earR') pos = hR.clone().lerp(hc, 0.35);
    else if (mode === 'toss') {
      const k = prog(t, 6.22, 6.75), base = hL.clone().add(hR).multiplyScalar(0.5);
      pos = base.add(v3(0.0, 4 * 0.2 * k * (1 - k) + 0.02, 0.2 + 0.1 * Math.sin(k * Math.PI)));
      ph.position.copy(pos); ph.lookAt(eyes); ph.rotateX(k * TAU * 1.25); ph.rotateZ(k * 2.2);
      return;
    }
    else if (mode === 'above') pos = hL.clone().add(hR).multiplyScalar(0.5).add(v3(0, 0.06, 0).applyQuaternion(R.torso.getWorldQuaternion(q)));
    else if (mode === 'falling' || mode === 'face') {
      const a = hL.clone().add(hR).multiplyScalar(0.5);
      const f = R.head.localToWorld(v3(0, 0.28, 0.36));
      const k = mode === 'face' ? 1 : E.inC(prog(t, 6.82, 6.97));
      pos = a.lerp(f, k);
      ph.position.copy(pos);
      ph.lookAt(hc); ph.rotateX(Math.PI); // boca abajo sobre la cara
      ph.rotateZ(0.4 * k);
      return;
    }
    ph.position.copy(pos);
    if (mode === 'ear' || mode === 'earR') { ph.lookAt(hc); ph.rotateZ(mode === 'ear' ? -0.25 : 0.25); ph.rotateX(-0.25); }
    else { ph.lookAt(eyes); }
  }

  // ---------- cámaras ----------
  function aim(c, pos, tgt, fov, shake = 0, t = 0, seed = 1) {
    c.position.set(...pos); c.fov = fov;
    if (shake) { c.position.x += fbm(t * 0.9, seed) * shake; c.position.y += fbm(t * 0.8, seed + 3) * shake; }
    const tg = new THREE.Vector3(...tgt);
    if (shake) { tg.x += fbm(t * 0.7, seed + 9) * shake * 0.6; tg.y += fbm(t * 0.75, seed + 11) * shake * 0.6; }
    c.up.set(0, 1, 0); c.lookAt(tg);
  }
  const V = a => a; // legibilidad
  const CAM = {
    wideA: (c, t) => aim(c, K(t, [[0, [0.35, 1.32, 4.0]], [2.8, [0.15, 1.2, 3.35], 'io']]), [0.05, 1.12, -0.6], 40, 0.03, t, 1),
    faceA: (c, t) => { const h = headC(leo); aim(c, [h.x + lerp(0.15, 0.06, prog(t, 2.8, 4.4)), h.y - 0.05, h.z + lerp(1.75, 1.45, E.io(prog(t, 2.8, 4.0)))], [h.x, h.y - 0.13, h.z], 34, 0.012, t, 2); if (t > 3.98) { const k = pulse(t, 3.98, 4.3, 0.02, 0.3); c.fov -= k * 3; } },
    grabA: (c, t) => aim(c, K(t, [[4.4, [1.0, 1.15, 2.75]], [6.0, [0.75, 1.2, 2.45], 'io']]), [0.12, 0.98, -0.4], 40, 0.03, t, 3),
    callA: (c, t) => { const h = headC(leo); aim(c, [h.x - 0.5, h.y - 0.05, h.z + 1.35], [h.x + 0.05, h.y - 0.14, h.z], 38, 0.02, t, 4); },
    callB: (c, t) => { const h = headC(dani); aim(c, [h.x + 0.5, h.y - 0.02, h.z + 1.35], [h.x - 0.02, h.y - 0.14, h.z], 40, 0.02, t, 5); },
    glow: (c, t) => aim(c, K(t, [[11.15, [-0.5, 1.2, 2.25]], [11.9, [-0.38, 1.22, 2.0], 'io']]), [0.25, 1.3, -0.75], 42, 0.02, t, 14),
    ots: (c, t) => { const p = wp(leoPhone); aim(c, K(t, [[10, [-0.85, 2.05, -0.75]], [11.15, [-0.62, 1.92, -0.6], 'io']]), [p.x, p.y, p.z], 40, 0.008, t, 6); },
    pov: (c, t) => {
      const p = wp(leoPhone); const n = v3(0, 0, 1).applyQuaternion(leoPhone.getWorldQuaternion(q));
      const d = K(t, [[10.0, 0.185], [11.15, 0.168, 'io'], [11.9, 0.173], [13.6, 0.16, 'io'], [14.0, 0.04, 'inC']]);
      const pos = p.clone().add(n.multiplyScalar(d));
      c.position.copy(pos); c.fov = 56;
      c.up.set(0, 1, 0).applyQuaternion(leoPhone.getWorldQuaternion(q)); c.lookAt(p);
      c.position.x += fbm(t * 1.1, 7) * 0.004; c.position.y += fbm(t * 1.0, 8) * 0.004;
    },
    reactA: (c, t) => { const h = headC(leo); aim(c, [h.x + 0.35, h.y - 0.2, h.z + 1.3], [h.x, h.y - 0.17, h.z], 40, 0.03, t, 9); },
    reactB: (c, t) => { const h = headC(dani); aim(c, [h.x + 0.45, h.y - 0.2, h.z + 1.3], [h.x, h.y - 0.17, h.z], 40, 0.03, t, 10); },
    winA: (c, t) => aim(c, K(t, [[26, [0.3, 1.05, 2.9]], [29, [0.15, 1.15, 2.6], 'io']]), [0, 1.15, -0.2], 42, 0.035, t, 11),
    winB: (c, t) => aim(c, K(t, [[26, [0.95, 2.05, 1.9]], [29, [0.8, 1.95, 1.8], 'io']]), [0.05, 0.85, -0.55], 42, 0.03, t, 12),
    end: (c, t) => { const a = K(t, [[29, -0.3], [33, 0.22, 'io']]), r = K(t, [[29, 4.9], [33, 4.55, 'io']]); aim(c, [Math.sin(a) * r, 1.75, Math.cos(a) * r], [0, 1.72, 0], 40, 0.02, t, 13); },
  };

  // ---------- lista de planos ----------
  const SPLIT_Y = [990, 930];
  const SHOTS = [
    { a: 0, b: 2.8, kind: 'full', S: A, cam: 'wideA', grade: 'bored' },
    { a: 2.8, b: 4.4, kind: 'full', S: A, cam: 'faceA', grade: 'bored' },
    { a: 4.4, b: 6.0, kind: 'full', S: A, cam: 'grabA', grade: 'bored2' },
    { a: 6.0, b: 10.0, kind: 'split', top: [A, 'callA'], bot: [B, 'callB'] },
    { a: 10.0, b: 11.15, kind: 'phone', S: A, cam: 'pov' },
    { a: 11.15, b: 11.9, kind: 'full', S: A, cam: 'glow' },
    { a: 11.9, b: 14.0, kind: 'phone', S: A, cam: 'pov' },
    { a: 14.0, b: 16.0, kind: 'ui' },
    { a: 16.0, b: 17.5, kind: 'split', top: [A, 'reactA'], bot: [B, 'reactB'] },
    { a: 17.5, b: 26.0, kind: 'ui' },
    { a: 26.0, b: 29.0, kind: 'split', top: [A, 'winA'], bot: [B, 'winB'] },
    { a: 29.0, b: DUR + 1, kind: 'end', S: Cs, cam: 'end' },
  ];
  const shotAt = t => SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];

  // ---------- estado del mundo en t ----------
  const tableSpot = v3(0.25, 0.418, 0.32);
  function updateWorld(t) {
    const mood = clamp((t - 11.25) / 0.35);
    const flick = t > 11.25 && t < 11.65 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.15) : mood;
    // salón
    A.update(t, mood);
    A.signM.color.setScalar(lerp(0.08, 2.6, flick));
    A.signLight.intensity = 3.2 * flick;
    A.ledM.color.setRGB(lerp(0.05, 2.2, flick), lerp(0.05, 0.8, flick), lerp(0.06, 4.5, flick));
    A.led1.intensity = 4 * flick; A.led2.intensity = 4 * flick;
    A.scene.environmentIntensity = lerp(0.32, 0.42, mood);
    A.key.intensity = lerp(1.5, 1.2, mood); A.key.color.set(mood > 0.5 ? '#e8e0ff' : '#dfe8ff');
    A.lamp.light.intensity = lerp(1.4, 1.0, mood);
    // dormitorio
    const dm = t > 8.95 ? (t < 9.25 ? (Math.sin(t * 80) > 0 ? 1 : 0.2) : 1) : 0;
    B.led.intensity = 2.2 * dm;
    B.fairy.forEach((f, i) => f.scale.setScalar(0.85 + 0.25 * Math.sin(t * 3 + i)));
    // muñecos
    const L = leoPose(t), D = daniPose(t);
    // manos: agarran el móvil, puños al celebrar
    const grips = (P, ph, fist) => { if (ph === 'both') P.gripL = P.gripR = 0.6; else if (ph === 'handL') P.gripL = 0.62; if (fist) P.gripL = P.gripR = 1; };
    grips(L.p, L.phone, t >= 26 && t < 29);
    grips(D.p, D.phone, false); if (t >= LINES.dani1.t - 0.1 && t < 10) D.p.gripR = 1; if (t >= 27.25 && t < 29) D.p.gripR = 0.9;
    pose(leo, L.p); pose(dani, D.p);
    A.scene.updateMatrixWorld(true); B.scene.updateMatrixWorld(true);
    placePhone(leoPhone, leo, L.phone, t, tableSpot);
    placePhone(daniPhone, dani, D.phone, t, null);
    if (D.phone === 'falling' || D.phone === 'face') {}
    if (t >= 6.75 && t < UT.answer - 0.1) daniPhone.position.add(v3(Math.sin(t * 157) * 0.005, Math.cos(t * 131) * 0.005, 0)); // vibra
    leoPhone.updateMatrixWorld(true); daniPhone.updateMatrixWorld(true);
    // luz de la pantalla en la cara
    const lit = (S, ph, on, col) => {
      S.face.intensity = on; S.face.color.set(col);
      const n = v3(0, 0, 1).applyQuaternion(ph.getWorldQuaternion(q));
      S.face.position.copy(wp(ph)).add(n.multiplyScalar(0.32));
    };
    lit(A, leoPhone, t > UT.wake && L.phone !== 'none' && L.phone !== 'table' ? (t > 11.2 ? 0.2 : 0.16) : 0, t > 11.2 ? '#a77bff' : '#cfd8ff');
    lit(B, daniPhone, D.phone === 'both' || D.phone === 'handL' ? 0.2 : 0, t > 14 ? '#b48cff' : '#e8eeff');
    // plató final
    const land = t - 29.0;
    const jumpIn = (d, delay) => { const k = prog(d, delay, delay + 0.45); return k < 1 ? Math.sin(k * Math.PI) * 0.5 + (1 - k) * 0.9 * (k < 0.5 ? 1 : 0) : 0; };
    const wave = (t, ph) => Math.sin(t * 9 + ph);
    const endPose = (R, x, ph, delay, who) => {
      const p = { ...STAND, x, y: 0.16 + Math.max(0, jumpIn(land, delay)), z: 0.1, ry: -x * 0.35, lean: 0.05, breath: Math.sin(t * 2 + ph) };
      const lk = prog(land, delay + 0.4, delay + 0.6);
      p.kneeL = p.kneeR = 0.25 * (1 - lk) * (land > delay ? 1 : 0); p.thighL = p.thighR = 0.2 * (1 - lk);
      const wv = clamp((land - delay - 0.5) * 4);
      p.armOutL = who === 'leo' ? 0.3 : 0.25; p.armFwdL = -0.1; p.elbowL = 0.3;
      p.armOutR = lerp(0.3, 2.3, wv); p.armFwdR = lerp(-0.1, -0.4, wv); p.elbowR = lerp(0.3, 0.9 + wave(t, ph) * 0.45, wv);
      if (who === 'dani' && land > 1.7) { p.armOutL = 0.9; p.armFwdL = -1.3; p.elbowL = 1.5; } // le pasa el brazo
      p.nod = -0.08; p.turn = -x * 0.3; p.tilt = wave(t * 0.5, ph) * 0.08;
      Object.assign(p, { lid: 0.08, look: [-x * 0.4, 0.05], brow: 0.6, smile: 1, open: who === 'dani' ? 0.35 : 0, squint: 0.35, eyeScale: 1.08 });
      if (who === 'leo' && land > 2.6 && land < 2.95) { p.lidL = 0.08; p.lidR = 1; p.smile = 1; p.open = 0; } // guiño
      pose(R, p);
    };
    endPose(leoC, -0.34, 0, 0.0, 'leo'); endPose(daniC, 0.34, 1.7, 0.12, 'dani');
    Cs.ringM.color.setRGB(1.6 + Math.sin(t * 4) * 0.4, 0.9, 4.0);
  }

  // ---------- composición ----------
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const o = out.getContext('2d');
  const grainC = document.createElement('canvas'); grainC.width = grainC.height = 256;
  { const g = grainC.getContext('2d'), id = g.createImageData(256, 256), r = rng(42); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }

  function render3D(S, camName, c, w, h, t) {
    setSize(w, h); c.aspect = w / h;
    CAM[camName](c, t); c.updateProjectionMatrix();
    rpass.scene = S.scene; rpass.camera = c;
    c.layers.enableAll();
    composer.render();
    return renderer.domElement;
  }
  function project(R, c, w, h, extra = 0) {
    const p = R.head.localToWorld(v3(0, R.TOP + extra, 0)).project(c);
    return [(p.x * 0.5 + 0.5) * w, (-p.y * 0.5 + 0.5) * h, p.z];
  }
  function bubble(x, X, Y, txt, t0, t, { size = 54, col = '#111', bg = '#fff', tail = 'down', maxW = 760, shout = false, accent, minY = 0, maxY = H } = {}) {
    if (t < t0) return;
    const k = E.outBack(prog(t, t0, t0 + 0.22));
    const shown = txt.slice(0, Math.max(1, Math.floor((t - t0) * 28)));
    x.save(); x.font = `900 ${size}px Nunito`;
    const tw = Math.min(maxW, x.measureText(txt).width), bw = tw + size * 1.3, bh = size * 1.75;
    const bx = clamp(X - bw / 2, 30, W - bw - 30);
    Y = clamp(Y, minY + bh + size * 0.7 + 30, maxY - 40);
    const by = Y - bh - (tail === 'down' ? size * 0.7 : 0);
    x.translate(X, Y); x.scale(k, k); x.rotate(shout ? -0.04 : 0); x.translate(-X, -Y);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.roundRect(bx + 8, by + 10, bw, bh, bh / 2); x.fill();
    x.fillStyle = bg; x.strokeStyle = accent || '#111'; x.lineWidth = 7;
    x.beginPath(); x.roundRect(bx, by, bw, bh, bh / 2); x.fill(); x.stroke();
    // cola
    const tx = clamp(X, bx + 50, bx + bw - 50);
    x.beginPath(); x.moveTo(tx - 26, by + bh - 4); x.lineTo(tx + 8, by + bh + size * 0.65); x.lineTo(tx + 22, by + bh - 4); x.fill();
    x.beginPath(); x.moveTo(tx - 26, by + bh - 1); x.lineTo(tx + 8, by + bh + size * 0.65); x.lineTo(tx + 22, by + bh - 1); x.stroke();
    x.fillStyle = bg; x.fillRect(tx - 24, by + bh - 12, 44, 10);
    x.fillStyle = col; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(shown, bx + size * 0.65, by + bh / 2 + 3);
    x.restore();
  }
  function nameTag(x, X, Y, label, sub, col) {
    x.save(); x.font = '900 40px Nunito'; const w1 = x.measureText(label).width; x.font = '700 30px Nunito'; const w2 = x.measureText(sub).width;
    const w = w1 + w2 + 90;
    x.fillStyle = 'rgba(10,10,14,.72)'; x.beginPath(); x.roundRect(X, Y, w, 74, 37); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(X + 37, Y + 37, 14, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.font = '900 40px Nunito'; x.textBaseline = 'middle'; x.fillText(label, X + 64, Y + 39);
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 30px Nunito'; x.fillText(sub, X + 78 + w1, Y + 40);
    x.restore();
  }
  function finish(x, t, strength = 1) {
    // viñeta + grano
    const g = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.42 * strength})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.05; x.globalCompositeOperation = 'overlay';
    const r = rng(Math.floor(t * FPS) + 1); const ox = -r() * 256, oy = -r() * 256;
    for (let yy = oy; yy < H; yy += 256) for (let xx = ox; xx < W; xx += 256) x.drawImage(grainC, xx, yy);
    x.restore();
  }

  function drawShot(s, t) {
    if (s.kind === 'full' || s.kind === 'end') {
      const cv = render3D(s.S, s.cam, cam, W, H, t);
      if (s.grade === 'bored' || s.grade === 'bored2') {
        const k = s.grade === 'bored' ? 1 : 1 - prog(t, 4.0, 4.8);
        o.filter = `saturate(${lerp(1, 0.55, k)}) contrast(${lerp(1, 1.06, k)})`; o.drawImage(cv, 0, 0); o.filter = 'none';
        o.save(); o.globalAlpha = 0.16 * k; o.globalCompositeOperation = 'soft-light'; o.fillStyle = '#3a5b9a'; o.fillRect(0, 0, W, H); o.restore();
      } else o.drawImage(cv, 0, 0);
    } else if (s.kind === 'phone') {
      // fondo desenfocado (profundidad de campo) + móvil y manos nítidos encima
      setSize(W, H); cam.aspect = W / H; CAM[s.cam](cam, t); cam.updateProjectionMatrix();
      cam.layers.set(0); rpass.scene = s.S.scene; rpass.camera = cam; composer.render();
      o.filter = 'blur(14px) brightness(.8) saturate(1.1)'; o.drawImage(renderer.domElement, -40, -70, W + 80, H + 140); o.filter = 'none';
      const bg = s.S.scene.background; s.S.scene.background = null;
      renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear();
      cam.layers.set(1); renderer.render(s.S.scene, cam);
      s.S.scene.background = bg; cam.layers.enableAll();
      // resplandor de la pantalla
      o.save(); o.globalCompositeOperation = 'lighter'; o.globalAlpha = 0.18; o.filter = 'blur(40px)'; o.drawImage(renderer.domElement, 0, 0); o.restore();
      o.drawImage(renderer.domElement, 0, 0);
    } else if (s.kind === 'ui') {
      o.drawImage(ui.drawFull(t), 0, 0);
    } else if (s.kind === 'split') {
      const intro = s.a === 6.0 ? E.outC(prog(t, s.a, s.a + 0.35)) : 1;
      const hh = 1000;
      const top = render3D(s.top[0], s.top[1], camB, W, hh, t);
      o.save(); o.beginPath(); o.moveTo(0, 0); o.lineTo(W, 0); o.lineTo(W, SPLIT_Y[1]); o.lineTo(0, SPLIT_Y[0]); o.closePath(); o.clip();
      o.drawImage(top, -(1 - intro) * W, 0); o.restore();
      const bot = render3D(s.bot[0], s.bot[1], camB, W, hh, t);
      o.save(); o.beginPath(); o.moveTo(0, SPLIT_Y[0]); o.lineTo(W, SPLIT_Y[1]); o.lineTo(W, H); o.lineTo(0, H); o.closePath(); o.clip();
      o.drawImage(bot, (1 - intro) * W, H - hh); o.restore();
      // divisoria con el degradado de BidVerse
      const g = o.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ff3344'); g.addColorStop(0.5, '#9b5cff'); g.addColorStop(1, '#3d8bff');
      o.save(); o.strokeStyle = g; o.lineWidth = 12; o.shadowColor = '#9b5cff'; o.shadowBlur = 30;
      o.beginPath(); o.moveTo(-10, SPLIT_Y[0]); o.lineTo(W + 10, SPLIT_Y[1]); o.stroke(); o.restore();
      // etiquetas y bocadillos
      const tagK = E.outBack(prog(t, s.a + 0.15, s.a + 0.45));
      o.save(); o.globalAlpha = clamp(tagK); nameTag(o, 40, 40, 'LEO', s.a < 26 ? 'on the couch' : 'won!', '#ff3344'); nameTag(o, 40, H - 114, 'DANI', s.a < 26 ? 'in their room' : 'lost', '#3d8bff'); o.restore();
      const pa = project(leo, camB, W, hh), pb = project(dani, camB, W, hh);
      const TOP = { minY: 0, maxY: SPLIT_Y[1] - 10 }, BOT = { minY: SPLIT_Y[0] + 10, maxY: H - 120 };
      const pop = (txt, X, Y, k, col, size = 96, rot = 0.1) => { o.save(); o.translate(X, Y); o.scale(k, k); o.rotate(rot); o.font = '900 ' + size + 'px "Big Shoulders Display"'; o.lineWidth = 14; o.lineJoin = 'round'; o.strokeStyle = '#111'; o.fillStyle = col; o.textAlign = 'center'; o.strokeText(txt, 0, 0); o.fillText(txt, 0, 0); o.restore(); };
      if (s.a === 6.0) {
        if (t < LINES.leo1.t + 1.9) bubble(o, pa[0] + 170, pa[1] + 40, LINES.leo1.text, LINES.leo1.t, t, { size: 52, accent: '#ff3344', ...TOP });
        if (t < 10) bubble(o, pb[0] + 150, H - hh + pb[1] + 40, LINES.dani1.text, LINES.dani1.t, t, { size: 58, accent: '#3d8bff', shout: true, ...BOT });
        if (t >= 6.2 && t < 7.3) { const j = Math.sin(t * 40) * 6, k = E.outBack(prog(t, 6.2, 6.35)); pop('RING RING!', clamp(pb[0] - 250, 200, W - 200) + j, H - hh + clamp(pb[1] + 60, 160, 800), k, '#ffffff', 74, -0.15); }
        if (t >= 6.25 && t < 6.9) pop('WHOA!', clamp(pb[0] + 230, 160, W - 160), H - hh + clamp(pb[1] - 60, 150, 800), E.outBack(prog(t, 6.25, 6.4)), '#ffcf5a', 110, 0.12);
      }
      if (s.a === 16.0) {
        bubble(o, pb[0] + 60, H - hh + pb[1] + 30, LINES.dani2.text, LINES.dani2.t, t, { size: 70, accent: '#3d8bff', shout: true, ...BOT });
        bubble(o, pa[0] + 80, pa[1] + 30, LINES.leo2.text, LINES.leo2.t, t, { size: 76, accent: '#ff3344', shout: true, ...TOP });
      }
      if (s.a === 26.0) {
        bubble(o, pa[0] + 60, pa[1] + 20, LINES.leo3.text, LINES.leo3.t, t, { size: 76, accent: '#ff3344', shout: true, ...TOP });
        if (t > LINES.dani3.t) bubble(o, pb[0] - 40, H - hh + pb[1] + 30, LINES.dani3.text, LINES.dani3.t, t, { size: 84, accent: '#3d8bff', shout: true, ...BOT });
        ui.confetti(o, t, 26.0, 71, W * 0.5, 600, 110, 1.2);
      }
    }
    // ----- capas de texto por encima del plano -----
    if (t < 2.85) {
      const k = E.outC(prog(t, 0.25, 0.7)), out_ = prog(t, 2.55, 2.8);
      o.save(); o.globalAlpha = k * (1 - out_); o.translate((1 - k) * -60, 0);
      o.fillStyle = 'rgba(10,10,14,.6)'; o.beginPath(); o.roundRect(50, 120, 640, 260, 24); o.fill();
      o.font = '900 128px "Big Shoulders Display"'; o.fillStyle = '#fff'; o.textBaseline = 'alphabetic'; o.fillText('SUNDAY', 90, 260);
      o.font = '800 56px Nunito'; o.fillStyle = '#ffcf5a'; o.fillText('5:42 PM', 92, 335);
      const s2 = 'Nothing to do…'.slice(0, Math.max(0, Math.floor((t - 0.9) * 16)));
      o.font = '700 44px Nunito'; o.fillStyle = 'rgba(255,255,255,.8)'; o.fillText(s2, 340, 333);
      o.restore();
      // medidor de aburrimiento
      const mk = E.outC(prog(t, 0.9, 1.25)), lv = E.io(prog(t, 1.2, 2.45));
      o.save(); o.globalAlpha = mk * (1 - out_); o.translate(0, (1 - mk) * 60);
      o.fillStyle = 'rgba(10,10,14,.7)'; o.beginPath(); o.roundRect(60, 1610, W - 120, 190, 26); o.fill();
      o.font = '900 40px Nunito'; o.fillStyle = '#fff'; o.letterSpacing = '6px'; o.fillText('BOREDOM LEVEL', 100, 1680); o.letterSpacing = '0px';
      o.fillStyle = 'rgba(255,255,255,.12)'; o.beginPath(); o.roundRect(100, 1712, W - 200, 52, 26); o.fill();
      const bg = o.createLinearGradient(100, 0, W - 100, 0); bg.addColorStop(0, '#35d04f'); bg.addColorStop(0.55, '#ffb02e'); bg.addColorStop(1, '#ff3344');
      o.fillStyle = bg; o.beginPath(); o.roundRect(100, 1712, Math.max(52, (W - 200) * lv), 52, 26); o.fill();
      if (lv > 0.97) { const fl = Math.floor(t * 8) % 2; o.font = '900 46px "Big Shoulders Display"'; o.fillStyle = fl ? '#ff3344' : '#fff'; o.textAlign = 'right'; o.fillText('MAX', W - 100, 1680); o.textAlign = 'left'; }
      else { o.font = '800 40px Nunito'; o.fillStyle = '#fff'; o.textAlign = 'right'; o.fillText(Math.round(lv * 100) + '%', W - 100, 1680); o.textAlign = 'left'; }
      o.restore();
    }
    if (t >= 3.0 && t < 4.4) { // pensamiento "…" e idea
      const hp = project(leo, cam, W, H, 0.06);
      if (t < 3.98) {
        const k = E.outBack(prog(t, 3.0, 3.25));
        o.save(); o.translate(clamp(hp[0] + 230, 200, W - 180), clamp(hp[1] - 120, 300, H)); o.scale(k, k);
        [[-150, 150, 18], [-110, 95, 28]].forEach(([dx, dy, r]) => { o.fillStyle = '#fff'; o.beginPath(); o.arc(dx, dy, r, 0, TAU); o.fill(); });
        o.fillStyle = '#fff'; o.beginPath(); o.ellipse(0, 0, 150, 92, 0, 0, TAU); o.fill();
        const nd = Math.min(3, Math.floor((t - 3.1) * 4));
        for (let i = 0; i < 3; i++) { o.fillStyle = i < nd ? '#333' : '#ddd'; o.beginPath(); o.arc(-55 + i * 55, 0, 17, 0, TAU); o.fill(); }
        o.restore();
      } else {
        const k = E.outBack(prog(t, 3.98, 4.2)), a = 1 - prog(t, 4.25, 4.4);
        o.save(); o.globalAlpha = a; o.translate(clamp(hp[0] + 250, 220, W - 220), clamp(hp[1] + 40, 260, H - 600)); o.scale(k * 1.1, k * 1.1);
        o.save(); o.globalCompositeOperation = 'lighter'; const g = o.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, 'rgba(255,220,90,.9)'); g.addColorStop(1, 'rgba(255,200,60,0)'); o.fillStyle = g; o.fillRect(-260, -260, 520, 520); o.restore();
        o.strokeStyle = '#ffd34d'; o.lineWidth = 12; o.lineCap = 'round';
        for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; o.beginPath(); o.moveTo(Math.cos(an) * 130, Math.sin(an) * 130); o.lineTo(Math.cos(an) * 190, Math.sin(an) * 190); o.stroke(); }
        o.font = '150px "Segoe UI Emoji"'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText('💡', 0, 0);
        o.restore();
        o.save(); o.globalAlpha = a; o.font = '900 120px "Big Shoulders Display"'; o.textAlign = 'center'; o.lineJoin = 'round'; o.lineWidth = 16; o.strokeStyle = '#111'; o.fillStyle = '#ffcf5a';
        o.translate(W / 2, 1560); o.rotate(-0.06); o.scale(k, k); o.strokeText('DING!', 0, 0); o.fillText('DING!', 0, 0); o.restore();
      }
    }
    if (t >= 4.4 && t < 6.0) { // "Llamando a Dani…"
      const k = E.outC(prog(t, 5.15, 5.4)), a = 1 - prog(t, 5.85, 6.0);
      if (k > 0) { o.save(); o.globalAlpha = k * a; nameTag(o, W / 2 - 170, 1640, 'Calling', 'Dani…', '#35d04f'); o.restore(); }
    }
    if (s.kind === 'end') endCard(t);
  }

  function endCard(t) {
    const d = t - 29.0;
    // logo
    const lk = prog(d, 0.25, 0.75), ls = lerp(2.2, 1, E.outBack(lk));
    const im = img.logo, lw = 860, lh = lw * im.height / im.width;
    o.save(); o.globalAlpha = clamp(lk * 3); o.translate(W / 2, 330); o.scale(ls, ls); o.rotate((1 - E.outC(lk)) * -0.1);
    o.save(); o.globalCompositeOperation = 'lighter'; o.globalAlpha = 0.5; o.filter = 'blur(30px)'; o.drawImage(im, -lw / 2, -lh / 2, lw, lh); o.restore();
    o.drawImage(im, -lw / 2, -lh / 2, lw, lh); o.restore();
    if (d > 0.7 && d < 1.2) { const k = prog(d, 0.72, 1.2); o.save(); o.globalAlpha = 1 - k; o.strokeStyle = '#fff'; o.lineWidth = 12; o.beginPath(); o.ellipse(W / 2, 330, 300 + k * 500, 120 + k * 260, 0, 0, TAU); o.stroke(); o.restore(); }
    // eslogan
    const words = ['BID.', 'FIGHT.', 'WIN.'], cols = ['#ffffff', '#ffcf5a', '#ffffff'];
    o.save(); o.font = '900 112px "Big Shoulders Display"'; o.textBaseline = 'alphabetic';
    const ws = words.map(w => o.measureText(w).width), gap = 26, tot = ws.reduce((a, b) => a + b, 0) + gap * 2;
    let x0 = (W - tot) / 2;
    words.forEach((w, i) => {
      const k = E.outBack(prog(d, 1.0 + i * 0.18, 1.3 + i * 0.18));
      o.save(); o.globalAlpha = clamp(k * 2); o.translate(x0 + ws[i] / 2, 600); o.scale(k, k);
      o.lineWidth = 14; o.lineJoin = 'round'; o.strokeStyle = 'rgba(20,6,50,.85)'; o.textAlign = 'center'; o.strokeText(w, 0, 0); o.fillStyle = cols[i]; o.fillText(w, 0, 0); o.restore();
      x0 += ws[i] + gap;
    });
    o.restore();
    const sk = E.outC(prog(d, 1.6, 1.95));
    o.save(); o.globalAlpha = sk; o.translate(0, (1 - sk) * 30);
    o.font = '800 46px Nunito'; o.fillStyle = 'rgba(255,255,255,.92)'; o.textAlign = 'center';
    o.fillText('Live auctions: Anime · UFC · Football', W / 2, 690);
    o.fillText('Play free with your friends', W / 2, 750);
    o.restore();
    // URL en grande abajo, para que se pueda leer y apuntar
    const ck = E.outBack(prog(d, 1.05, 1.45)), pul = 1 + Math.sin(t * 5) * 0.015 * (d > 1.6 ? 1 : 0);
    o.save(); o.globalAlpha = clamp(ck * 2); o.translate(W / 2, 1575); o.scale(ck, ck);
    o.font = '900 74px "Big Shoulders Display"'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.letterSpacing = '6px';
    o.lineWidth = 12; o.lineJoin = 'round'; o.strokeStyle = 'rgba(20,6,50,.85)'; o.strokeText('PLAY NOW AT', 0, 0);
    o.fillStyle = '#ffcf5a'; o.fillText('PLAY NOW AT', 0, 0); o.letterSpacing = '0px';
    o.restore();
    o.save(); o.translate(W / 2, 1735); o.scale(ck * pul, ck * pul);
    let fs = 92; o.font = '900 ' + fs + 'px Nunito'; while (o.measureText(SITE).width > W - 150 && fs > 40) { fs -= 2; o.font = '900 ' + fs + 'px Nunito'; }
    const uw = o.measureText(SITE).width + 90, uh = fs * 1.9;
    o.shadowColor = 'rgba(155,92,255,.9)'; o.shadowBlur = 60;
    const g = o.createLinearGradient(-uw / 2, 0, uw / 2, 0); g.addColorStop(0, '#ff3344'); g.addColorStop(0.5, '#9b5cff'); g.addColorStop(1, '#3d8bff');
    o.fillStyle = g; o.beginPath(); o.roundRect(-uw / 2 - 10, -uh / 2 - 10, uw + 20, uh + 20, (uh + 20) / 2); o.fill(); o.shadowBlur = 0;
    o.fillStyle = '#ffffff'; o.beginPath(); o.roundRect(-uw / 2, -uh / 2, uw, uh, uh / 2); o.fill();
    o.fillStyle = '#1b0b3d'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(SITE, 0, 4);
    o.restore();
    ui.confetti(o, t, 29.05, 88, W / 2, 900, 120, 1.4);
  }

  // transiciones entre planos
  function transition(t) {
    // destello en cortes clave
    for (const [c, len, col] of [[26.0, 0.18, '#fff'], [29.0, 0.25, '#fff'], [6.0, 0.12, '#fff']]) {
      const k = pulse(t, c - 0.02, c + len, 0.02, len);
      if (k > 0) { o.save(); o.globalAlpha = k * 0.85; o.fillStyle = col; o.fillRect(0, 0, W, H); o.restore(); }
    }
    // barrido rápido (whip) en cortes de reacción
    for (const c of [10.0, 16.0, 17.5, 11.15, 11.9]) {
      const k = pulse(t, c - 0.1, c + 0.1, 0.1, 0.1);
      if (k > 0.01) {
        o.save(); o.globalAlpha = 0.22 * k;
        const dir = t < c ? -1 : 1;
        for (let i = 1; i <= 5; i++) o.drawImage(out, dir * i * 40 * k, 0);
        o.restore();
      }
    }
    // fundido final
    const f = prog(t, DUR - 0.35, DUR);
    if (f > 0) { o.fillStyle = `rgba(0,0,0,${f})`; o.fillRect(0, 0, W, H); }
  }

  // UI del móvil solo cuando se ve
  function updatePhones(t, s) {
    const seesLeo = s.kind === 'full' || s.kind === 'phone' || s.kind === 'split';
    if (seesLeo) { ui.drawPhone(t, 'leo'); leoTex.needsUpdate = true; }
    if (s.kind === 'split') { ui.drawPhone(t, 'dani'); daniTex.needsUpdate = true; }
  }

  function frame(t) {
    t = Math.min(t, DUR - 1e-3);
    updateWorld(t);
    const s = shotAt(t);
    updatePhones(t, s);
    o.save(); o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.restore();
    drawShot(s, t);
    finish(o, t, s.kind === 'ui' ? 0.6 : 1);
    transition(t);
    return out;
  }

  // ---------- exportación MP4 (WebCodecs + muxer propio) ----------
  async function exportMP4({ name = 'BidVerse_promo.mp4', from = 0, to = DUR, bitrate = 10e6, onlyVideo = false } = {}) {
    const t0 = performance.now();
    const vSamples = []; let avcC = null; let lastTs = -1, reorder = false;
    const enc = new VideoEncoder({
      output: (chunk, meta) => {
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description);
        if (chunk.timestamp < lastTs) reorder = true; lastTs = chunk.timestamp;
        const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); vSamples.push({ data: b, key: chunk.type === 'key' });
      },
      error: e => { throw e; },
    });
    const cfg = { codec: 'avc1.640033', width: W, height: H, bitrate, framerate: FPS, avc: { format: 'avc' }, latencyMode: 'quality', bitrateMode: 'variable' };
    const hw = new URLSearchParams(location.search).get('hw') || 'prefer-software';
    enc.configure({ ...cfg, hardwareAcceleration: hw });
    const n = Math.round((to - from) * FPS);
    for (let i = 0; i < n; i++) {
      const t = from + i / FPS;
      frame(t);
      const vf = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
      vf.close();
      while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 2));
      if (i % 60 === 0) console.log(`frame ${i}/${n} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
    }
    await enc.flush(); enc.close();
    if (reorder) console.log('AVISO: el codificador reordenó fotogramas (B-frames)');
    let audio = null;
    if (!onlyVideo) {
      const buf = await renderSoundtrack(DUR, 48000);
      const aSamples = []; let asc = null;
      const aenc = new AudioEncoder({ output: (c, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description && !asc) asc = new Uint8Array(meta.decoderConfig.description); const b = new Uint8Array(c.byteLength); c.copyTo(b); aSamples.push({ data: b }); }, error: e => { throw e; } });
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
      const s0 = Math.round(from * 48000), s1 = Math.round(to * 48000), CH = 4800;
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      for (let s = s0; s < s1; s += CH) {
        const len = Math.min(CH, s1 - s), data = new Float32Array(len * 2);
        data.set(L.subarray(s, s + len), 0); data.set(R.subarray(s, s + len), len);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(((s - s0) / 48000) * 1e6), data });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      audio = { sampleRate: 48000, channels: 2, asc: asc || Uint8Array.of(0x11, 0x90), samples: aSamples, bitrate: 192000 };
    }
    const mp4 = muxMP4({ width: W, height: H, timescale: 90000, delta: 90000 / FPS, avcC, samples: vSamples }, audio);
    await fetch('/__save?f=' + encodeURIComponent(name), { method: 'POST', body: mp4 });
    const secs = (performance.now() - t0) / 1000;
    return { frames: n, bytes: mp4.length, secs, reorder, audioChunks: audio ? audio.samples.length : 0 };
  }

  // guarda el audio en WAV (para revisarlo aparte)
  async function exportWAV(name = 'soundtrack.wav') {
    const buf = await renderSoundtrack(DUR, 48000);
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
    const ws = (o_, s) => [...s].forEach((c, i) => dv.setUint8(o_ + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, 48000, true); dv.setUint32(28, 48000 * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 4, true);
    let peak = 0;
    for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); dv.setInt16(44 + i * 4, l * 32767, true); dv.setInt16(46 + i * 4, r * 32767, true); }
    // sonoridad por segundo (RMS en dBFS) para revisar la mezcla sin oírla
    const rms = [];
    for (let s = 0; s < Math.floor(n / 48000); s++) { let acc = 0; for (let i = s * 48000; i < (s + 1) * 48000; i++) acc += L[i] * L[i] + R[i] * R[i]; rms.push(Math.round(10 * Math.log10(acc / 96000 + 1e-12))); }
    await fetch('/__save?f=' + name, { method: 'POST', body: ab });
    return { peak, rms };
  }

  // fotograma reducido en JPEG (para revisar planos)
  function still(t, scale = 0.5) {
    const c = frame(t), s = document.createElement('canvas'); s.width = W * scale; s.height = H * scale;
    s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
    return s.toDataURL('image/jpeg', 0.85);
  }
  function sheet(times, cols = 4, scale = 0.25) {
    const rows = Math.ceil(times.length / cols), s = document.createElement('canvas');
    s.width = W * scale * cols; s.height = H * scale * rows;
    const x = s.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, s.width, s.height);
    times.forEach((t, i) => {
      const c = frame(t); const X = (i % cols) * W * scale, Y = Math.floor(i / cols) * H * scale;
      x.drawImage(c, X, Y, W * scale, H * scale);
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(X, Y, 120, 40); x.fillStyle = '#ff0'; x.font = '700 28px monospace'; x.fillText(t.toFixed(2), X + 8, Y + 30);
    });
    return s.toDataURL('image/jpeg', 0.85);
  }

  if (holder) holder.appendChild(out);
  return { frame, exportMP4, exportWAV, still, sheet, out, renderSoundtrack, DUR, FPS };
}

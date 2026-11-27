/* BidVerse 3D · ESTILO DE COMBATE de cada personaje: cómo pega, con qué y si puede lanzar energía. Solo cambia la coreografía
   del combate 3D (golpes, técnicas y choques), nunca el guion ni el resultado.
   k  ki     energía: artes marciales y rayos (Goku, Vegeta…)          fist   puños y patadas, sin rayos (Saitama, Luffy…)
      blade  espada (Zoro, Ichigo…)                                     pole   arma de asta, cadena, maza, hacha o martillo (Toji, Thor…)
      claw   garras, cola, látigos o kagune (Meruem, Kaneki…)            stand  JoJo: pega su Stand, no él
      psy    telequinesis, gravedad o la mente (Tatsumaki, Lelouch…)    mage   magia, jutsu o alquimia a distancia (Roy, Itachi…)
   w  con qué pega: knuckle (puño americano) kick (patadas) big (espadón) dual (dos espadas) chain (cuchillo con cadena) staff spear
      hammer axe club whip tail kagune cards needle gun chainsaw kunai bokken
   ce 0 = no lanza energía: nada de rayos, ondas ni cortes voladores; sus técnicas son cuerpo a cuerpo
   au 0 = sin aura de energía: al cargar levanta polvo y viento en vez de brillar
   el elemento con el que se ven sus golpes (EL abajo) · sc color de su Stand · fast velocísimo (estelas) · heavy golpes lentos y demoledores
   Quien no está aquí sale de su aspecto (f3d/looks.js): con espada → blade, con lanza/bastón/maza → pole; si no, ki. */
const S = (k, o) => Object.assign({ k, ce: 1, au: 1 }, o);
const NOCE = { ce: 0 }, BARE = { ce: 0, au: 0 };
export const EL = { fire: '#ff6a1a', water: '#3aa0ff', thunder: '#ffd23f', blood: '#d1132b', dark: '#8a2be2', wind: '#7dffc8', ice: '#bfe9ff', sun: '#ffb020',
  hamon: '#ffd84a', sand: '#d8b878', wood: '#7ac74a', shadow: '#6a2ab8', cut: '#ff1f3d', paper: '#f4f1e8', steel: '#e4eaf4' };
export const STYLE = {
  // ---- sin energía: músculo, acero y velocidad ----
  'Toji': S('pole', { ...BARE, w: 'chain', fast: 1 }),
  'Adam': S('fist', { ...BARE, w: 'knuckle' }),
  'Saitama': S('fist', { ...BARE, heavy: 1 }),
  'Yujiro Hanma': S('fist', { ...BARE, heavy: 1 }),
  'Fumihiko Takaba': S('fist', BARE), 'Reigen': S('fist', BARE),
  'Maki': S('blade', { ...BARE, fast: 1 }), 'Levi': S('blade', { ...BARE, w: 'dual', fast: 1 }), 'Mikasa': S('blade', { ...BARE, w: 'dual', fast: 1 }),
  'Guts': S('blade', { ...BARE, w: 'big', heavy: 1 }), 'Gintoki': S('blade', { ...BARE, w: 'bokken' }),
  'Denji': S('blade', { ...BARE, w: 'chainsaw', el: 'blood' }), 'Lu Bu': S('pole', { ...BARE, w: 'spear', heavy: 1 }),
  // ---- cuerpo a cuerpo con aura (energía que refuerza el golpe, pero no la lanzan) ----
  'Luffy': S('fist', { ...NOCE, heavy: 1 }), 'Yuji': S('fist', NOCE), 'Todo': S('fist', { ...NOCE, heavy: 1 }), 'Kinji Hakari': S('fist', NOCE),
  'Naoya Zenin': S('fist', { ...NOCE, fast: 1 }), 'Naobito Zenin': S('fist', { ...NOCE, fast: 1 }), 'Akaza': S('fist', { ...NOCE, fast: 1, el: 'ice' }),
  'Might Guy': S('fist', { ...NOCE, w: 'kick', fast: 1 }), 'Tsunade': S('fist', { ...NOCE, heavy: 1 }), 'Fourth Raikage': S('fist', { ...NOCE, heavy: 1, el: 'thunder' }),
  'Sanji': S('fist', { ...NOCE, w: 'kick', el: 'fire' }), 'Eren': S('fist', { ...NOCE, heavy: 1 }), 'Reiner': S('fist', { ...NOCE, heavy: 1 }),
  'Uvogin': S('fist', { ...NOCE, heavy: 1 }), 'Phinks': S('fist', NOCE), 'Zeus': S('fist', { ...NOCE, heavy: 1 }),
  'Kenpachi': S('blade', { ...NOCE, heavy: 1 }), 'Giyu': S('blade', { ...NOCE, el: 'water' }), 'Tanjiro': S('blade', { ...NOCE, el: 'water' }),
  'Rengoku': S('blade', { ...NOCE, el: 'fire' }), 'Zenitsu': S('blade', { ...NOCE, el: 'thunder', fast: 1 }), 'Inosuke': S('blade', { ...NOCE, w: 'dual', fast: 1 }),
  'Nanami': S('blade', NOCE), 'Mahoraga': S('blade', { ...NOCE, heavy: 1 }), 'Kars': S('blade', { ...NOCE, fast: 1 }),
  'Ban': S('pole', { ...NOCE, w: 'staff' }), 'Hiromi Higuruma': S('pole', { ...NOCE, w: 'hammer' }),
  // ---- puños con energía ----
  'Garou': S('fist'), 'Gojo': S('fist'), 'Sukuna': S('fist', { el: 'cut' }), 'Netero': S('fist'), 'Gon': S('fist'), 'Ace': S('fist', { el: 'fire' }),
  'Nezuko': S('fist', { w: 'kick', el: 'blood' }), 'Mereoleona': S('fist', { el: 'fire' }), 'Joseph Joestar': S('fist', { el: 'hamon' }),
  'Yuki Tsukumo': S('fist', { heavy: 1 }), 'Zeno Zoldyck': S('fist'), 'Silva Zoldyck': S('fist'), 'Armin': S('fist', { heavy: 1, el: 'fire' }), 'Don Freecss': S('fist'),
  // ---- energía (rayos) ----
  'Goku': S('ki'), 'Vegeta': S('ki'), 'Frieza': S('ki'), 'Cell': S('ki'), 'Piccolo': S('ki'), 'Broly': S('ki', { heavy: 1 }), 'Boros': S('ki', { heavy: 1 }),
  'Beerus': S('ki'), 'Genos': S('ki', { el: 'fire' }), 'Grand Priest': S('ki'), 'Naruto': S('ki'), 'Kakashi': S('ki', { el: 'thunder' }), 'Jiraiya': S('ki'),
  'Madara': S('ki'), 'Obito': S('ki'), 'Shisui Uchiha': S('ki', { fast: 1 }), 'Hagoromo Otsutsuki': S('ki'), 'Kaguya Otsutsuki': S('ki'), 'Ging Freecss': S('ki'),
  'Ryu Ishigori': S('ki', { heavy: 1 }), 'Absolute Being': S('ki'),
  // ---- espadas que también cortan a distancia ----
  'Zoro': S('blade', { w: 'dual' }), 'Mihawk': S('blade', { w: 'big' }), 'Shanks': S('blade'), 'Law': S('blade'), 'Ichigo': S('blade', { w: 'big' }),
  'Aizen': S('blade'), 'Byakuya': S('blade'), 'Renji': S('blade', { w: 'whip' }), 'Sasuke': S('blade', { el: 'thunder' }), 'Kisame': S('blade', { w: 'big', el: 'water' }),
  'Killer B': S('blade', { w: 'dual' }), 'Minato': S('blade', { w: 'kunai', fast: 1 }), 'Tobirama Senju': S('blade', { w: 'kunai', fast: 1, el: 'water' }),
  'Yuta': S('blade'), 'Asta': S('blade', { w: 'big' }), 'Yami': S('blade', { el: 'dark' }), 'Meliodas': S('blade'), 'Zeldris': S('blade', { el: 'dark' }),
  'Feitan': S('blade', { fast: 1 }), 'Griffith': S('blade', { fast: 1 }), 'Suzaku': S('blade', { fast: 1 }), 'Sung Jin-Woo': S('blade', { w: 'dual', el: 'shadow' }),
  // ---- armas de asta, mazas, hachas y martillos ----
  'Whitebeard': S('pole', { w: 'spear', heavy: 1 }), 'Kaido': S('pole', { w: 'club', heavy: 1 }), 'Thor': S('pole', { w: 'hammer', heavy: 1, el: 'thunder' }),
  'Escanor': S('pole', { w: 'axe', heavy: 1, el: 'sun' }), 'Whis': S('pole', { w: 'staff' }), 'Buddha': S('pole', { w: 'staff' }), 'Hiruzen Sarutobi': S('pole', { w: 'staff' }),
  'Hajime Kashimo': S('pole', { w: 'staff', el: 'thunder' }), 'Mei Mei': S('pole', { w: 'axe' }),
  'Nobara Kugisaki': S('pole', { w: 'hammer' }), 'Kurapika': S('pole', { w: 'chain' }),
  // ---- garras, colas, látigos y kagune ----
  'Meruem': S('claw', { w: 'tail' }), 'Muzan': S('claw', { w: 'whip', el: 'blood' }), 'Kaneki': S('claw', { w: 'kagune', el: 'blood' }), 'Mahito': S('claw'),
  'Menthuthuyoupi': S('claw', { heavy: 1 }), 'Neferpitou': S('claw', { fast: 1 }), 'Killua': S('claw', { fast: 1, el: 'thunder' }), 'Orochimaru': S('claw', { w: 'whip' }),
  'Pride': S('claw', { w: 'whip', el: 'shadow' }),
  // ---- Stands (JoJo) ----
  'Jotaro Kujo': S('stand', { sc: '#8a5cff' }), 'Dio Brando': S('stand', { sc: '#ffcc33' }), 'Giorno Giovanna': S('stand', { sc: '#ffd23f' }),
  'Josuke Higashikata': S('stand', { sc: '#ff8fc8' }), 'Jolyne Cujoh': S('stand', { sc: '#4aa3ff' }), 'Yoshikage Kira': S('stand', { sc: '#ff9ec4' }),
  'Diavolo': S('stand', { sc: '#ff2a3a' }), 'Enrico Pucci': S('stand', { sc: '#e8e8f0' }),
  // ---- telequinesis, gravedad y mente ----
  'Tatsumaki': S('psy'), 'Mob': S('psy'), 'Zeno': S('psy'), 'Pain': S('psy'), 'Kenjaku': S('psy'), 'Lucifero': S('psy'), 'Nanika': S('psy'),
  'Toge Inumaki': S('psy'), 'Lelouch': S('psy'), 'C.C.': S('psy'), 'Light Yagami': S('psy'), 'Truth': S('psy'), 'God': S('psy'),
  // ---- magia, jutsu y alquimia ----
  'Roy Mustang': S('mage', { el: 'fire' }), 'Itachi': S('mage', { el: 'fire' }), 'Gaara': S('mage', { el: 'sand' }), 'Hashirama': S('mage', { el: 'wood' }),
  'Deidara': S('mage', { el: 'fire' }), 'Konan': S('mage', { el: 'paper' }), 'Danzo': S('mage', { el: 'wind' }), 'Kabuto': S('mage'), 'Megumi': S('mage', { el: 'shadow' }),
  'Jogo': S('mage', { el: 'fire' }), 'Geto': S('mage', { el: 'dark' }), 'Choso': S('mage', { el: 'blood' }), 'Uraume': S('mage', { el: 'ice' }),
  'Takako Uro': S('mage', { el: 'wind' }), 'Dagon': S('mage', { el: 'water' }), 'Hanami': S('mage', { el: 'wood' }), 'Yuno': S('mage', { el: 'wind' }),
  'Noelle': S('mage', { el: 'water' }), 'Julius': S('mage'), 'Dante Zogratis': S('mage', { el: 'dark' }), 'Demon King': S('mage', { el: 'dark' }),
  'Hisoka': S('mage', { w: 'cards' }), 'Chrollo Lucilfer': S('mage'), 'Shaiapouf': S('mage'), 'Illumi Zoldyck': S('mage', { w: 'needle' }),
  'Rick Sanchez': S('mage', { w: 'gun' }), 'Father': S('mage', { el: 'thunder' }), 'Van Hohenheim': S('mage'),
};
const POLE = { staff: 'staff', spear: 'spear', axe: 'axe', hammer: 'hammer', club: 'club' };
const CACHE = new Map();
export function styleOf(name, look) {
  if (CACHE.has(name)) return CACHE.get(name);
  let st = STYLE[name];
  if (!st) { const x = (look && look.x) || {}, p = Object.keys(POLE).find(k => x[k]);
    st = x.sword || x.bigsword || x.dual || x.blade ? S('blade', { w: x.bigsword ? 'big' : x.dual ? 'dual' : '' }) : p ? S('pole', { w: POLE[p] }) : S('ki'); }
  st = Object.assign({ w: '', el: '' }, st); CACHE.set(name, st); return st;
}
// color de los golpes: su elemento · si no tiene aura, acero · si no, null (el color de su aura o de su jugador)
export const elCol = st => (st && st.el && EL[st.el]) || null;

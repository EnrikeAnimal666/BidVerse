// Para fotos reales rellena "img" con una URL o data URI; si está vacío se muestra el emoji.
// ESCALA DE PODER (0-1000). Método: lo que cada personaje demuestra en el canon (manga/anime), no opiniones de fans.
// Base = nivel de destrucción: calle 100 · edificio 200 · ciudad 300 · montaña/isla 400 · país 500 · planeta 600 · sistema solar 700 · galaxia 800 · universo 900.
// Ajuste ±40 por velocidad, resistencia/regeneración, habilidades y técnica. Los duelos directos del canon mandan (p. ej. Sukuna venció a Gojo).
// [nombre, emoji, poder, tono, anime, feat canon, búsqueda(s) de foto separadas por |]
const IMG0={"Goku": "https://imgs.search.brave.com/HUzKsaH7lLZnIBgEDd9ddiUd6mW71SA315-1vPA-BuQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzM4L2Yx/L2RlLzM4ZjFkZWJl/ZjI2ODdmNTAyMjcw/NzUwYWNmNDZhZDUy/LmpwZw", "Naruto": "https://imgs.search.brave.com/J1Q6maCwmLOwoZvjLqlD15CI60nIQNdcODzEAkvUUcw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzUzLzI2/LzM5LzUzMjYzOTQ0/YjI3ZGE1ZGU0MjA1/OWQ2ODRlYzUxMjVk/LmpwZw", "Luffy": "https://imgs.search.brave.com/uTN4Aym4TuEPsmJF8Ub2u0GnbyiotSoz7XWp5_X3oHA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvdGh1bWJu/YWlsL2x1ZmZ5LXBo/b25lLXdhbGxwYXBl/ci16MHlmYnNvMnlk/OXJvb254LndlYnA", "Saitama": "https://imgs.search.brave.com/NeRMgGJF_QwLJvyJUhW5d0xcgOMXOUhwL3aeHAqyk0M/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2ViLzE2/L2NhL2ViMTZjYWVk/NWY0MDI2MmI0YTYx/ODBlNTJlNmEwZjgw/LmpwZw", "Vegeta": "https://imgs.search.brave.com/QLJulZEIbfeRXrp6i26uxMfaxZUQWJ_4ROr0bTmgsn4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2FmL2Iz/LzI5L2FmYjMyOTM2/OWI4YmM1MGJmMTgy/NGM0NTYzYjljZTFi/LmpwZw"};
const R=[
["Saitama","👊",960,52,"One Punch Man","Sin techo: venció a Boros y a Garou Cósmico"],
["Goku","🐉",915,30,"Dragon Ball","Ultra Instinto dominado: ya supera a Beerus","Son Goku"],
["Vegeta","👑",880,225,"Dragon Ball","Ultra Ego: mejora con cada golpe recibido"],
["Freezer","😈",760,290,"Dragon Ball","Black Freezer: destruye planetas a voluntad","Frieza"],
["Garou","🦹",720,290,"One Punch Man","Garou Cósmico: manipula espacio-tiempo"],
["Sung Jin-Woo","🌑",720,250,"Solo Leveling","Monarca de las Sombras","Sung Jin-Woo|Jinwoo"],
["Majin Buu","🍬",700,330,"Dragon Ball","Kid Buu destruyó la Tierra y se regenera"],
["Cell","🪲",650,100,"Dragon Ball","Amenaza con volar el sistema solar"],
["Piccolo","👽",640,120,"Dragon Ball","Piccolo Naranja: nivel planeta"],
["Madara","👺",600,5,"Naruto","Jinchūriki del Diez Colas: Chibaku Tensei","Madara Uchiha"],
["Naruto","🍥",580,38,"Naruto","Modo Barión con Kurama","Naruto Uzumaki"],
["Sasuke","⚡",570,250,"Naruto","Rinnegan y Susanoo de Indra","Sasuke Uchiha"],
["Boros","🛸",560,270,"One Punch Man","Cañón Rugiente: amenaza al planeta"],
["Eren","🏔️",560,25,"Shingeki no Kyojin","Titán Fundador: el Retumbar arrasa el mundo","Eren Yeager|Eren Jaeger"],
["Ichigo","⚔️",545,18,"Bleach","Getsuga final; sangre Quincy y Hollow","Ichigo Kurosaki"],
["Krillin","🥋",520,20,"Dragon Ball","Su Kienzan cortó la cola de Freezer"],
["Aizen","🦋",520,270,"Bleach","Hogyoku: regeneración y Kyōka Suigetsu","Sousuke Aizen"],
["Sukuna","👹",490,350,"Jujutsu Kaisen","20 dedos: venció a Gojo en Shinjuku","Ryomen Sukuna"],
["Luffy","🏴‍☠️",470,0,"One Piece","Gear 5: derrota a Kaido","Monkey D. Luffy"],
["Gojo","👁️",470,195,"Jujutsu Kaisen","Infinito, Púrpura y Vacío Ilimitado","Satoru Gojo"],
["Natsu","🦖",470,10,"Fairy Tail","E.N.D. y Dragon Force","Natsu Dragneel"],
["Barbablanca","🌊",460,200,"One Piece","Gura Gura: terremotos que parten el mundo","Whitebeard"],
["Shanks","🍶",455,355,"One Piece","Yonko: Haki del Rey a gran escala"],
["Kaido","🐲",450,260,"One Piece","Yonko: Bagua del Trueno"],
["Mihawk","🦅",440,280,"One Piece","El mejor espadachín del mundo","Dracule Mihawk"],
["Byakuya","🌺",440,320,"Bleach","Senbonzakura Kageyoshi","Byakuya Kuchiki"],
["Zoro","🍃",430,130,"One Piece","Hirió a Kaido y venció a King","Roronoa Zoro"],
["Kenpachi","🪓",430,0,"Bleach","Zanpakutō liberado: fuerza bruta","Kenpachi Zaraki"],
["Gildarts","💫",430,270,"Fairy Tail","Crash: destruye todo lo que toca","Gildarts Clive"],
["Itachi","🐦‍⬛",420,350,"Naruto","Susanoo, Totsuka e Izanami","Itachi Uchiha"],
["Tatsumaki","🌀",420,120,"One Punch Man","Telequinesis que levanta enormes masas"],
["Meruem","🐜",410,140,"Hunter x Hunter","Rey Quimera: sobrevive a la Rosa del Pobre"],
["Yamcha","🐺",400,210,"Dragon Ball","Veterano Z, muy por debajo de sus compañeros"],
["Mob","🔮",390,280,"Mob Psycho 100","Mob ???%: telequinesis desatada","Shigeo Kageyama"],
["Netero","🙏",380,60,"Hunter x Hunter","Guanyin y Rosa del Pobre","Isaac Netero|Netero"],
["Sanji","🚬",380,55,"One Piece","Ifrit Jambe y Haki de Observación"],
["Renji","🐍",380,350,"Bleach","Bankai Hihio Zabimaru","Renji Abarai"],
["Shigaraki","🖐️",380,230,"My Hero Academia","Decaimiento, fusionado con AFO","Tomura Shigaraki"],
["Yuno","🍃",380,140,"Black Clover","Espíritu del Viento"],
["All Might","💥",370,50,"My Hero Academia","Detroit Smash cambia el clima"],
["Asta","☘️",370,0,"Black Clover","Anti-magia con Demon Dweller"],
["Kakashi","📖",360,210,"Naruto","Kamui y Susanoo perfecto","Kakashi Hatake"],
["Jiraiya","🐸",360,140,"Naruto","Modo Sabio Sapo"],
["Ace","🌋",360,15,"One Piece","Puño de Fuego en Marineford","Portgas D. Ace|Portgas"],
["Yuji","🐯",360,340,"Jujutsu Kaisen","Black Flash encadenados","Itadori"],
["Yusuke","👻",360,200,"Yu Yu Hakusho","Pistola Espiritual y sangre de demonio","Yusuke Urameshi"],
["Yami","🌑",350,230,"Black Clover","Magia oscura y ki","Yami Sukehiro"],
["Gaara","🏜️",340,40,"Naruto","Sarcófago y Entierro de Arena gigantes"],
["Law","🩺",340,180,"One Piece","Room: cirugía de combate","Trafalgar"],
["Muzan","🩸",340,350,"Kimetsu no Yaiba","Rey de los demonios, regeneración","Muzan Kibutsuji"],
["Deku","🥦",340,135,"My Hero Academia","One For All al 100%","Izuku Midoriya"],
["Erza","⚔️",340,355,"Fairy Tail","Re-equip de armaduras","Erza Scarlet"],
["Makima","🎯",340,5,"Chainsaw Man","Diablo del Control"],
["Rock Lee","💪",330,130,"Naruto","Ocho Puertas Internas"],
["Megumi","🐕",330,220,"Jujutsu Kaisen","Mahoraga y Jardín de Sombras","Megumi Fushiguro"],
["Genos","🤖",330,200,"One Punch Man","Cañón de incineración"],
["Gray","🧊",330,205,"Fairy Tail","Make de hielo, Ice Devil Slayer","Gray Fullbuster"],
["Shinji","🤖",330,275,"Evangelion","Eva-01 en modo berserk","Shinji Ikari"],
["Sakura","🌸",320,330,"Naruto","Fuerza de Tsunade: cráteres enormes","Sakura Haruno"],
["Akaza","🥊",320,280,"Kimetsu no Yaiba","Luna Superior 3: Compass Needle"],
["Hiei","🖤",320,270,"Yu Yu Hakusho","Dragón de las Llamas Negras"],
["Armin","📘",300,200,"Shingeki no Kyojin","Titán Colosal: explosión de vapor","Armin Arlert"],
["Gon","🎣",300,105,"Hunter x Hunter","Jajanken adulto","Gon Freecss"],
["Bakugo","💣",300,25,"My Hero Academia","Howitzer Impact","Katsuki Bakugou|Bakugou"],
["Noelle","💦",300,210,"Black Clover","Armadura Valquiria de agua","Noelle Silva"],
["Toji","🥷",290,150,"Jujutsu Kaisen","Sin energía maldita, mató a hechiceros","Toji Fushiguro|Touji Fushiguro"],
["Giyu","💧",290,205,"Kimetsu no Yaiba","Pilar del Agua","Giyuu Tomioka|Giyu Tomioka"],
["Todoroki","🧊",290,200,"My Hero Academia","Hielo y fuego combinados","Shouto Todoroki|Shoto Todoroki"],
["Kurama","🌹",290,340,"Yu Yu Hakusho","Látigo de Rosas","Youko Kurama|Kurama"],
["Hisoka","🃏",280,330,"Hunter x Hunter","Bungee Gum y Texture Surprise","Hisoka Morow"],
["Killua","🌠",280,215,"Hunter x Hunter","Godspeed eléctrico","Killua Zoldyck"],
["Rengoku","🦁",280,20,"Kimetsu no Yaiba","Pilar de la Llama: Novena Forma","Kyoujurou Rengoku|Rengoku"],
["Denji","🪚",280,15,"Chainsaw Man","Hombre Motosierra: se regenera con sangre"],
["Nanami","👔",270,45,"Jujutsu Kaisen","Técnica de la proporción","Kento Nanami"],
["Kurapika","⛓️",270,50,"Hunter x Hunter","Emperor Time: cadenas"],
["Reiner","🛡️",260,40,"Shingeki no Kyojin","Titán Acorazado","Reiner Braun"],
["Tanjiro","🔥",260,350,"Kimetsu no Yaiba","Danza del Dios del Fuego","Tanjirou Kamado|Tanjiro Kamado"],
["Nezuko","🎋",255,340,"Kimetsu no Yaiba","Sangre explosiva y regeneración","Nezuko Kamado"],
["Nobara","🔨",250,20,"Jujutsu Kaisen","Resonancia con clavos","Nobara Kugisaki"],
["Zenitsu","🌩️",250,55,"Kimetsu no Yaiba","Respiración del Trueno: Rapidez Divina","Zenitsu Agatsuma"],
["Inosuke","🐗",240,190,"Kimetsu no Yaiba","Respiración de la Bestia","Inosuke Hashibira"],
["Lucy","✨",240,45,"Fairy Tail","Espíritus celestiales","Lucy Heartfilia"],
["Power","🩸",230,355,"Chainsaw Man","Diablo de la Sangre"],
["Levi","🗡️",220,150,"Shingeki no Kyojin","Velocidad humana: el mejor soldado","Levi Ackerman|Levi"],
["Roy Mustang","🧤",220,15,"Fullmetal Alchemist","Alquimia de fuego"],
["Nami","🍊",220,30,"One Piece","Clima Tact y Zeus"],
["Edward Elric","⚗️",210,45,"Fullmetal Alchemist","Alquimia sin círculo"],
["Gintoki","🍓",210,340,"Gintama","Samurái de Edo","Gintoki Sakata"],
["Yor","🌹",200,0,"Spy x Family","Princesa Espina, asesina","Yor Forger"],
["Mikasa","🧣",190,0,"Shingeki no Kyojin","Ackerman: humana en su límite","Mikasa Ackerman"],
["Alphonse","🪖",190,25,"Fullmetal Alchemist","Armadura alquímica","Alphonse Elric"],
["Uraraka","☁️",170,330,"My Hero Academia","Gravedad cero; héroe en formación","Ochaco Uraraka"],
["Loid","🕵️",150,210,"Spy x Family","Espía de combate experto","Loid Forger"],
["Mumen Rider","🚲",130,215,"One Punch Man","Héroe de clase C, sin poderes"],
["Leorio","💼",130,30,"Hunter x Hunter","Médico y Puño Mensajero","Leorio Paladiknight|Leorio"],
["Spike","🔫",130,45,"Cowboy Bebop","Jeet Kune Do y pistola","Spike Spiegel"],
["Anya","🥜",100,330,"Spy x Family","Niña telépata","Anya Forger"],
["Reigen","🧂",90,40,"Mob Psycho 100","Charlatán con poderes mínimos","Reigen Arataka"],
["Zeno","👶",1000,45,"Dragon Ball","Rey de Todo: borra universos con un gesto","Zen'Ou|Zeno|Omni-King"],
["Gran Sacerdote","🪄",975,260,"Dragon Ball","Ángel supremo, padre de Whis","Daishinkan|Grand Priest"],
["Whis","🧘",940,195,"Dragon Ball","Ángel: rebobina el tiempo, velocidad divina"],
["Vados","🔮",935,290,"Dragon Ball","Ángel de Champa, a nivel de Whis"],
["Beerus","🐱",905,275,"Dragon Ball","Dios de la Destrucción: Hakai"],
["Champa","😼",860,300,"Dragon Ball","Dios de la Destrucción del Universo 6"],
["Broly","💚",830,120,"Dragon Ball","Saiyajin Legendario: igualó a Goku y Vegeta"],
["Kaguya","🐇",650,285,"Naruto","Diosa Otsutsuki: Tsukuyomi Infinito","Kaguya Otsutsuki"],
["Obito","🌀",540,255,"Naruto","Jinchūriki del Diez Colas con Rinnegan","Obito Uchiha"],
["Hashirama","🌳",500,120,"Naruto","Dios Shinobi: Mokuton y Modo Sabio","Hashirama Senju"],
["Minato","⚡",430,50,"Naruto","Dios del Trueno Volador: Rasengan","Minato Namikaze"],
["Might Guy","🥋",420,100,"Naruto","Octava Puerta: Night Guy","Might Guy|Maito Gai"],
["Pain","🌪️",380,240,"Naruto","Shinra Tensei arrasa Konoha","Pain|Nagato"],
["Orochimaru","🐍",340,150,"Naruto","Ocho Cabezas y Edo Tensei"],
["Tsunade","💎",320,55,"Naruto","Fuerza y curación legendarias"],
["Kisame","🦈",300,205,"Naruto","Samehada y Prisión de Agua","Kisame Hoshigaki"],
["Neji","👁️",260,215,"Naruto","Byakugan: 64 Palmas","Neji Hyuga"],
["Lucius","⏳",480,45,"Black Clover","Rey Mago: magia de tiempo","Lucius Zogratis"],
["Mahoraga","⚙️",420,150,"Jujutsu Kaisen","Se adapta a todo: soldado divino"],
["Yuta","💍",410,215,"Jujutsu Kaisen","Rika y copia de técnicas","Yuta Okkotsu"],
["Jogo","☄️",340,15,"Jujutsu Kaisen","Desastre volcánico: Meteoro Máximo"],
["Geto","🪱",330,260,"Jujutsu Kaisen","Manipulación de Maldiciones: Uzumaki","Suguru Geto"],
["Maki","🔪",320,130,"Jujutsu Kaisen","Restricción Celestial: fuerza y velocidad al límite","Maki Zenin"],
["Mahito","🧵",320,200,"Jujutsu Kaisen","Transfiguración Ociosa"],
["Choso","🩸",280,350,"Jujutsu Kaisen","Manipulación de sangre: Perforación"],
["Todo","👏",280,45,"Jujutsu Kaisen","Boogie Woogie y Black Flash","Aoi Todo"]
];
const POOLS={anime:R.map(([n,e,pw,h,a,f,q])=>({n,e,pw,h,a,f,q:q||n,img:IMG0[n]||""}))};
const START=20,MAXC=3,SECS=10;
const EXTRA={Goku:{a:"Dragon Ball",au:{n:"Ultra Instinto",a:"#e6f2ff",b:"#6fa0ff"}},Vegeta:{a:"Dragon Ball"},
Naruto:{a:"Naruto",au:{n:"Modo Kurama",a:"#ffd54a",b:"#ff7a00"}},Luffy:{a:"One Piece",au:{n:"Gear 5",a:"#ffffff",b:"#8fd3ff"}},Zoro:{a:"One Piece"},
Saitama:{a:"One Punch Man",au:{n:"Puño Serio",a:"#fff1a8",b:"#ffb300"}},Ichigo:{a:"Bleach",au:{n:"Bankai",a:"#ff3b3b",b:"#1a0000"}},
Levi:{a:"Shingeki no Kyojin"},Gojo:{a:"Jujutsu Kaisen"},Sukuna:{a:"Jujutsu Kaisen",au:{n:"Rey de las Maldiciones",a:"#ff1f1f",b:"#4a0000"}},Tanjiro:{a:"Kimetsu no Yaiba"}};
POOLS.anime.forEach(c=>Object.assign(c,EXTRA[c.n]));
let deck,idx,cur,bid,leader,left,tick,P,skips,locked,cat,passed,free=-1,bt=0;
const $=id=>document.getElementById(id),pad2=n=>String(n).padStart(2,'0');
/* ---------- IDIOMAS / LANGUAGES (ES · EN). Para añadir otro idioma, copia el bloque "en" y tradúcelo. ---------- */
const L={
es:{
marquee:'BidVerse ✦ Subasta en directo ✦ 20$ por jugador ✦ 3 personajes por jugador ✦ Escala de poder ✦ ',
sub1:'Cada jugador tiene 20$',sub2:'3 personajes por jugador',scaleBtn:'Consultar escala de poder',
cat1:'Anime',cat1d:'Goku, Naruto, Luffy…',soon:'Próximamente',football:'Fútbol',back:'← Menú',lastBid:'Última puja',
scaleTitle:'Escala de poder',
scaleNote:'Escala de 0 a 1000 basada en lo que cada personaje demuestra en el canon (manga/anime), no en opiniones de fans: sobre todo su capacidad de destrucción, ajustada por velocidad, resistencia, habilidades y técnica. Cada 250 puntos equivalen a 10 veces más poder. Las fotos se descargan de MyAnimeList la primera vez (pueden tardar unos minutos).',
fightWipe:'¡Combate!',
player:n=>'Jugador '+n,bidPh:'tu puja',bidBtn:'Pujar',takeBtn:'Quedármelo',free:'gratis',
skipLbl:'Saltar este lote',noSkips:'Sin saltos',passFree:'Pasar · cuesta 1 salto',autoPass:'Pasas automáticamente',passed:'Has pasado',
concede:n=>`Saltar · se lo lleva el Jugador ${n}`,
noBids:'Sin pujas',freeLot:'Lote gratis',paid:n=>'pagó $'+n,random:'asignado al azar',
errValid:'Escribe una cantidad válida',errOver:n=>`Tiene que superar $${n}`,errMoney:n=>`Solo tienes $${n}`,
soldLine:(p,b)=>`¡Vendido!<br>Jugador ${p} · $${b}`,
stampSold:(p,nm,pr)=>`<small>¡Vendido!</small><strong>Jugador ${p}</strong><u>se lleva a <b>${nm}</b></u><em>${pr}</em>`,
forPrice:b=>'por $'+b,
infoFree:(p,nm,f)=>`Jugador ${p} recibe a ${nm} gratis${f?' (sin pases: lo recibe sí o sí)':''}.`,
infoSold:(p,nm,b,m)=>`Jugador ${p} se lleva a ${nm} por $${b} · le quedan $${m}.`,
discard:'Lote descartado<br>−1 salto',noBidsStamp:'Sin pujas<br>−1 salto a cada uno',
brokeStamp:'<small>Sin dinero</small><strong>Reparto al azar</strong><u>Ninguno puede pujar: los lotes se asignan solos</u>',
afkStamp:'<small>Nadie puja</small><strong>Reparto al azar</strong><u>Los lotes restantes se asignan solos</u>',
brokeInfo:'Ninguno de los dos tiene dinero: los personajes que quedan se reparten al azar hasta que cada jugador tenga 3.',
afkInfo:'Nadie ha pujado a tiempo: los personajes que quedan se reparten al azar hasta que cada jugador tenga 3.',
hintFree:(o,f,n)=>`El Jugador ${o} no puede pujar, así que el Jugador ${f} recibe este lote gratis: puede pasar (le quedan ${n}) o quedárselo${n?'':' · sin pases: tiene que quedárselo'}.`,
hintPass:(a,o)=>`El Jugador ${a} pasa: el Jugador ${o} puja lo que quiera y se lo lleva al momento.`,
hintBase:'Precio base: $1 · escribe tu puja.',
auctionOver:'Subasta terminada.',ps:'PS',fightStart:'¡Comienza el combate!',
sends:(p,nm)=>`¡El Jugador ${p} saca a <b>${nm}</b>!`,vs:'vs',
down:nm=>`¡${nm} ya no puede continuar!`,stands:(nm,pc)=>`${nm} sigue en pie con el ${pc}% de vida`,
tie:'Empate',wins:p=>`¡Gana el Jugador ${p}!`,winsH:p=>'Gana el Jugador '+p,nobody:'Nadie ha comprado personajes',again:'Jugar otra vez'
},
en:{
marquee:'BidVerse ✦ Live auction ✦ $20 per player ✦ 3 characters per player ✦ Power scale ✦ ',
sub1:'Each player has $20',sub2:'3 characters per player',scaleBtn:'View power scale',
cat1:'Anime',cat1d:'Goku, Naruto, Luffy…',soon:'Coming soon',football:'Football',back:'← Menu',lastBid:'Last bid',
scaleTitle:'Power scale',
scaleNote:'Scale from 0 to 1000 based on what each character shows in canon (manga/anime), not fan opinions: mainly destructive capacity, adjusted for speed, durability, abilities and technique. Every 250 points equals 10 times more power. Photos are downloaded from MyAnimeList the first time (this can take a few minutes).',
fightWipe:'Fight!',
player:n=>'Player '+n,bidPh:'your bid',bidBtn:'Bid',takeBtn:'Take it',free:'free',
skipLbl:'Skip this lot',noSkips:'No skips left',passFree:'Pass · costs 1 skip',autoPass:'You pass automatically',passed:'You passed',
concede:n=>`Skip · Player ${n} takes it`,
noBids:'No bids',freeLot:'Free lot',paid:n=>'paid $'+n,random:'randomly assigned',
errValid:'Enter a valid amount',errOver:n=>`Must be higher than $${n}`,errMoney:n=>`You only have $${n}`,
soldLine:(p,b)=>`Sold!<br>Player ${p} · $${b}`,
stampSold:(p,nm,pr)=>`<small>Sold!</small><strong>Player ${p}</strong><u>takes <b>${nm}</b></u><em>${pr}</em>`,
forPrice:b=>'for $'+b,
infoFree:(p,nm,f)=>`Player ${p} gets ${nm} for free${f?' (no skips left: must take it)':''}.`,
infoSold:(p,nm,b,m)=>`Player ${p} takes ${nm} for $${b} · $${m} left.`,
discard:'Lot discarded<br>−1 skip',noBidsStamp:'No bids<br>−1 skip each',
brokeStamp:'<small>No money</small><strong>Random deal</strong><u>Nobody can bid: the lots are assigned automatically</u>',
afkStamp:'<small>Nobody bids</small><strong>Random deal</strong><u>The remaining lots are assigned automatically</u>',
brokeInfo:'Neither player has any money: the remaining characters are dealt out at random until each player has 3.',
afkInfo:'Nobody bid in time: the remaining characters are dealt out at random until each player has 3.',
hintFree:(o,f,n)=>`Player ${o} can't bid, so Player ${f} gets this lot for free: they can pass (${n} left) or take it${n?'':' · no skips left: they must take it'}.`,
hintPass:(a,o)=>`Player ${a} passes: Player ${o} can bid anything and takes it right away.`,
hintBase:'Starting price: $1 · enter your bid.',
auctionOver:'Auction over.',ps:'HP',fightStart:'The fight begins!',
sends:(p,nm)=>`Player ${p} sends out <b>${nm}</b>!`,vs:'vs',
down:nm=>`${nm} can't continue!`,stands:(nm,pc)=>`${nm} is still standing with ${pc}% HP`,
tie:'Draw',wins:p=>`Player ${p} wins!`,winsH:p=>'Player '+p+' wins',nobody:'Nobody bought any characters',again:'Play again'
}};
// Nombres y animes que cambian según el idioma (el nombre interno sigue siendo el de la carpeta fotos/)
const NAMEEN={'Barbablanca':'Whitebeard','Freezer':'Frieza','Gran Sacerdote':'Grand Priest'};
const ANIMEEN={'Shingeki no Kyojin':'Attack on Titan','Kimetsu no Yaiba':'Demon Slayer'};
// Hazañas en inglés (si falta una, se muestra la versión en español)
const FEN={"Saitama":"No visible ceiling: beat Boros and Cosmic Garou","Goku":"Mastered Ultra Instinct: now surpasses Beerus","Vegeta":"Ultra Ego: grows stronger with every hit taken","Freezer":"Black Frieza: destroys planets at will","Garou":"Cosmic Garou: manipulates space-time","Sung Jin-Woo":"Shadow Monarch","Majin Buu":"Kid Buu destroyed Earth and regenerates","Cell":"Threatens to blow up the solar system","Piccolo":"Orange Piccolo: planet level","Madara":"Ten-Tails Jinchūriki: Chibaku Tensei","Naruto":"Baryon Mode with Kurama","Sasuke":"Rinnegan and Indra's Susanoo","Boros":"Roaring Cannon: threatens the planet","Eren":"Founding Titan: the Rumbling razes the world","Ichigo":"Final Getsuga; Quincy and Hollow blood","Krillin":"His Destructo Disc cut Frieza's tail","Aizen":"Hōgyoku: regeneration and Kyōka Suigetsu","Sukuna":"20 fingers: beat Gojo in Shinjuku","Luffy":"Gear 5: defeats Kaido","Gojo":"Infinity, Hollow Purple and Unlimited Void","Natsu":"E.N.D. and Dragon Force","Barbablanca":"Gura Gura: world-splitting quakes","Shanks":"Yonko: large-scale Conqueror's Haki","Kaido":"Yonko: Thunder Bagua","Mihawk":"World's greatest swordsman","Byakuya":"Senbonzakura Kageyoshi","Zoro":"Wounded Kaido and beat King","Kenpachi":"Released Zanpakutō: raw force","Gildarts":"Crash: destroys whatever he touches","Itachi":"Susanoo, Totsuka and Izanami","Tatsumaki":"Telekinesis that lifts enormous masses","Meruem":"Chimera Ant King: survives the Poor Man's Rose","Yamcha":"Z veteran, far below his allies","Mob":"Mob ???%: unleashed telekinesis","Netero":"Guanyin and Poor Man's Rose","Sanji":"Ifrit Jambe and Observation Haki","Renji":"Bankai Hihio Zabimaru","Shigaraki":"Decay, fused with AFO","Yuno":"Wind Spirit","All Might":"Detroit Smash changes the weather","Asta":"Anti-magic with Demon Dweller","Kakashi":"Kamui and Perfect Susanoo","Jiraiya":"Toad Sage Mode","Ace":"Fire Fist at Marineford","Yuji":"Chained Black Flashes","Yusuke":"Spirit Gun and demon blood","Yami":"Dark magic and ki","Gaara":"Giant Sand Coffin and Burial","Law":"Room: combat surgery","Muzan":"King of demons, regeneration","Deku":"One For All at 100%","Erza":"Armor re-equip","Makima":"Control Devil","Rock Lee":"Eight Inner Gates","Megumi":"Mahoraga and Chimera Shadow Garden","Genos":"Incineration Cannon","Gray":"Ice Make, Ice Devil Slayer","Shinji":"Eva-01 in berserk mode","Sakura":"Tsunade-like strength: huge craters","Akaza":"Upper Moon 3: Compass Needle","Hiei":"Dragon of the Darkness Flame","Armin":"Colossal Titan: steam blast","Gon":"Adult Jajanken","Bakugo":"Howitzer Impact","Noelle":"Water Valkyrie Armor","Toji":"No cursed energy, killed sorcerers","Giyu":"Water Hashira","Todoroki":"Ice and fire combined","Kurama":"Rose Whip","Hisoka":"Bungee Gum and Texture Surprise","Killua":"Electric Godspeed","Rengoku":"Flame Hashira: Ninth Form","Denji":"Chainsaw Man: regenerates with blood","Nanami":"Ratio Technique","Kurapika":"Emperor Time: chains","Reiner":"Armored Titan","Tanjiro":"Hinokami Kagura","Nezuko":"Explosive blood and regeneration","Nobara":"Resonance with nails","Zenitsu":"Thunder Breathing: Godlike Speed","Inosuke":"Beast Breathing","Lucy":"Celestial spirits","Power":"Blood Fiend","Levi":"Human speed: the best soldier","Roy Mustang":"Flame alchemy","Nami":"Clima-Tact and Zeus","Edward Elric":"Alchemy without a circle","Gintoki":"Edo samurai","Aki":"Fox Devil and sword","Yor":"Thorn Princess, assassin","Mikasa":"Ackerman: human at her limit","Alphonse":"Alchemical armor","Uraraka":"Zero Gravity; hero in training","Loid":"Expert combat spy","Mumen Rider":"Class C hero, no powers","Leorio":"Medic and Messenger Fist","Spike":"Jeet Kune Do and a pistol","Anya":"Telepathic child","Reigen":"Con man with minimal powers","Zeno":"King of Everything: erases universes with a gesture","Gran Sacerdote":"Supreme Angel, father of Whis","Whis":"Angel: rewinds time, divine speed","Vados":"Champa's Angel, on Whis's level","Beerus":"God of Destruction: Hakai","Champa":"Universe 6's God of Destruction","Broly":"Legendary Saiyan: matched Goku and Vegeta","Kaguya":"Otsutsuki goddess: Infinite Tsukuyomi","Obito":"Ten-Tails Jinchūriki with Rinnegan","Hashirama":"God of Shinobi: Wood Release and Sage Mode","Minato":"Flying Thunder God: Rasengan","Might Guy":"Eighth Gate: Night Guy","Pain":"Shinra Tensei levels Konoha","Orochimaru":"Eight Heads and Edo Tensei","Tsunade":"Legendary strength and healing","Kisame":"Samehada and Water Prison","Neji":"Byakugan: 64 Palms","Lucius":"Wizard King: time magic","Mahoraga":"Adapts to everything: divine general","Yuta":"Rika and technique copying","Jogo":"Volcanic disaster: Maximum Meteor","Geto":"Curse Manipulation: Uzumaki","Maki":"Heavenly Restriction: strength and speed at the limit","Mahito":"Idle Transfiguration","Choso":"Blood Manipulation: Piercing Blood","Todo":"Boogie Woogie and Black Flash"};
let lang=(()=>{try{const s=localStorage.getItem('bvlang');if(s&&L[s])return s}catch(e){}return /^es/i.test(navigator.language||'')?'es':'en'})();
const t=(k,...a)=>{const v=L[lang][k]??L.en[k]??k;return typeof v==='function'?v(...a):v};
const dn=c=>lang==='en'?(NAMEEN[c.n]||c.n):c.n,an=a=>lang==='en'?(ANIMEEN[a]||a):a,fe=c=>lang==='en'?(FEN[c.n]||c.f):c.f;
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.l===lang));
  $('mq').textContent=t('marquee').repeat(8);
}
function setLang(l){
  lang=l;try{localStorage.setItem('bvlang',l)}catch(e){}
  applyLang();
  if(P&&cur){document.querySelectorAll('.side h2').forEach((h,i)=>h.textContent=t('player',i+1));$('nm').textContent=dn(cur);$('fr').textContent=an(cur.a);hint();render()}
  if($('scale').classList.contains('open'))openScale();
}
applyLang();
function panel(p){const n=p+1;return `<section class="side" style="--c:var(--p${n});--on:var(--on${n})">
<header><div class="pad">${n}</div><div><h2>${t('player',n)}</h2></div><div class="money" id="m${p}"></div></header>
<div id="s${p}"></div>
<div class="ctl"><label class="inp"><span>$</span><input id="i${p}" type="number" min="1" step="1" inputmode="numeric" placeholder="${t('bidPh')}" onkeydown="if(event.key==='Enter')place(${p})"></label>
<button class="go" id="g${p}" onclick="place(${p})">${t('bidBtn')}</button></div>
<button class="skip" id="k${p}" onclick="skip(${p})"><span class="sl" id="kl${p}">${t('skipLbl')}</span><span class="pips" id="kp${p}"></span></button>
<div class="msg" id="e${p}"></div></section>`}
function start(c){
  bt++;$('wipe').className='wipe';document.querySelector('.board').style.display='';
  $('end').className='end';$('end').innerHTML='';
  cat=c;deck=[...POOLS[c]].sort(()=>Math.random()-.5);idx=-1;wantImg(deck);
  P=[{m:START,c:[]},{m:START,c:[]}];skips=[2,2];
  $('P1').innerHTML=panel(0);$('P2').innerHTML=panel(1);
  $('menu').style.display='none';$('game').style.display='block';$('end').style.display='none';
  next();
}
function toMenu(){bt++;clearInterval(tick);$('wipe').className='wipe';$('game').style.display='none';$('menu').style.display='block'}
const can=p=>P[p].c.length<MAXC;
const out=p=>!can(p)||P[p].m<1;
function hint(){if(free>=0){$('info').textContent=t('hintFree',2-free,free+1,skips[free]);return}const a=[0,1].filter(p=>passed[p]);$('info').textContent=a.length?t('hintPass',a[0]+1,2-a[0]):t('hintBase')}
function next(){
  clearInterval(tick);idx++;
  if(idx>=deck.length||(!can(0)&&!can(1)))return finish();
  cur=deck[idx];wantImg([cur],true);bid=0;leader=-1;left=SECS;free=-1;
  const e=[can(0),can(1)],b=[e[0]&&P[0].m>=1,e[1]&&P[1].m>=1],dead=e[0]&&e[1]&&!b[0]&&!b[1];
  if(e[0]&&e[1]){if(b[0]!==b[1])free=b[0]?0:1}else free=e[0]?0:1;
  passed=[false,false];if(free>=0)passed[1-free]=true;locked=dead;
  $('pic').innerHTML=(cur.img?`<img src="${cur.img}" alt="${cur.n}">`:`<div class="e">${cur.e}</div>`)+'<div class="stamp" id="stamp"><span id="st"></span></div>';
  $('pic').style.setProperty('--h',cur.h);
  const L=$('lot'),au=cur.au;L.classList.toggle('hasaura',!!au);
  if(au){L.style.setProperty('--a1',au.a);L.style.setProperty('--a2',au.b);
    $('pic').insertAdjacentHTML('afterbegin','<div class="aura"></div>')}
  $('fr').textContent=an(cur.a);
  $('nm').textContent=dn(cur);
  hint();render();timer();
  const tk=bt;
  if(dead)return afkDeal(true);
  if(free>=0&&skips[free]<=0){locked=true;leader=free;render();return void setTimeout(()=>{if(tk===bt)close()},1600)}
  tick=setInterval(()=>{left--;timer();if(left<=0)close(true)},1000);
}
function timer(){$('bar').style.width=Math.max(left,0)/SECS*100+'%';$('barw').classList.toggle('low',left<=3);$('tm').textContent='0:'+pad2(Math.max(left,0))}
function render(){
  $('bid').textContent=leader<0?'—':bid?'$'+bid:t('free');
  $('who').textContent=leader<0?t(free>=0?'freeLot':'noBids'):t('player',leader+1);
  for(let p=0;p<2;p++){
    $('m'+p).textContent='$'+P[p].m;
    let h='';
    for(let i=0;i<MAXC;i++){const c=P[p].c[i];
      h+=c?`<div class="slot full" style="--h:${c.h}"><div class="av">${imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:c.e}</div><div><b>${dn(c)}</b><small>${c.paid?t('paid',c.paid):c.free?t('free'):t('random')}</small></div></div>`
          :`<div class="slot"><div class="av"></div></div>`}
    $('s'+p).innerHTML=h;
    $('g'+p).disabled=$('i'+p).disabled=locked||passed[p];
    $('i'+p).disabled=$('i'+p).disabled||free===p;$('g'+p).textContent=t(free===p?'takeBtn':'bidBtn');$('i'+p).placeholder=t(free===p?'free':'bidPh');
    $('k'+p).disabled=locked||leader===p||!(leader>=0)&&(passed[p]||skipLocked(p));
    $('kl'+p).textContent=leader>=0&&leader!==p?t('concede',leader+1):passed[p]?t(out(p)?'autoPass':'passed'):skipLocked(p)?t('noSkips'):t(free===p?'passFree':'skipLbl');
    $('kp'+p).innerHTML=[0,1].map(i=>`<i class="${i<skips[p]?'on':''}"></i>`).join('');
    $('k'+p).classList.toggle('conc',leader>=0&&leader!==p&&!locked);
  }
}
function err(p,t){$('e'+p).textContent=t;setTimeout(()=>{if($('e'+p).textContent===t)$('e'+p).textContent=''},2500)}
function place(p){
  if(locked||passed[p])return;
  if(free===p){leader=p;bid=0;return close()}
  const v=Math.floor(Number($('i'+p).value));
  if(!v||v<1)return err(p,t('errValid'));
  if(v<=bid)return err(p,t('errOver',bid));
  if(v>P[p].m)return err(p,t('errMoney',P[p].m));
  bid=v;leader=p;left=SECS;timer();
  if(passed[1-p]){$('i0').value=$('i1').value='';return close()}
  $('i0').value=$('i1').value='';
  render();const b=$('bid');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
}
function stamp(t,c){const s=$('stamp');$('st').className=c||'';$('st').innerHTML=t;s.style.display='grid'}
function close(afk){
  clearInterval(tick);locked=true;
  if(afk&&leader<0&&free>=0){leader=free;bid=0}
  if(leader>=0){P[leader].m-=bid;P[leader].c.push({...cur,paid:bid,free:free===leader});stamp(t('soldLine',leader+1,bid));$('info').textContent='';}
  else if(afk){afkDeal();return}
  else if(free>=0){stamp(t('discard'));skips[free]=Math.max(0,skips[free]-1);$('info').textContent=''}
  else{stamp(t('noBidsStamp'));skips=skips.map(s=>Math.max(0,s-1));$('info').textContent='';}
  render();if(leader>=0){const m=$('m'+leader),sd=$('P'+(leader+1)).firstElementChild;
    stamp(t('stampSold',leader+1,dn(cur),free===leader?t('free'):t('forPrice',bid)),'win w'+(leader+1));
    m.classList.add('pop');sd.classList.add('won');
    $('s'+leader).children[P[leader].c.length-1].classList.add('new');
    $('info').textContent=free===leader?t('infoFree',leader+1,dn(cur),skips[leader]<=0):t('infoSold',leader+1,dn(cur),bid,P[leader].m);
    setTimeout(()=>{m.classList.remove('pop');sd.classList.remove('won')},1600)}
  const tk=bt;setTimeout(()=>{if(tk===bt)next()},2600);
}
function afkDeal(broke){
  const rest=deck.slice(idx).sort(()=>Math.random()-.5);
  while(rest.length&&(can(0)||can(1))){
    const o=[0,1].filter(can);
    const p=o.length===1?o[0]:P[0].c.length===P[1].c.length?Math.round(Math.random()):P[0].c.length<P[1].c.length?0:1;
    P[p].c.push({...rest.pop(),paid:0});
  }
  stamp(t(broke?'brokeStamp':'afkStamp'),'win w0');
  $('info').textContent=t(broke?'brokeInfo':'afkInfo');
  render();
  const tk=bt;setTimeout(()=>{if(tk===bt){idx=deck.length;next()}},3800);
}
const skipLocked=p=>skips[p]<=0;
function skip(p){
  if(locked||leader===p)return;
  if(leader>=0){close();return}
  if(skipLocked(p)||passed[p])return;
  passed[p]=true;
  if(passed[1-p])return close();
  left=SECS;timer();render();hint();
}

/* ---------- COMBATE FINAL ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Escala logarítmica: cada POWER_BASE puntos = 10 veces más poder (250 -> 100 puntos de diferencia = x2,5).
const POWER_BASE=250,S=c=>Math.pow(10,c.pw/POWER_BASE);
const spr=c=>imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:`<div class="e">${c.e}</div>`;
function arena(){return `<div class="arena">`+[1,0].map(p=>`<div class="fgt a${p}" style="--c:var(--p${p+1})"><div class="hpbox" id="hb${p}"><div class="hn"><b id="bn${p}"></b><span>${t('player',p+1)}</span></div><div class="hpr"><small>${t('ps')}</small><div class="hpb"><i id="bh${p}"></i></div></div><div class="bl" id="bb${p}"></div></div><div class="sp" id="bs${p}"></div></div>`).join('')+`<div class="dlg" id="dlg"></div></div>`}

function finish(){
  clearInterval(tick);locked=true;render();$('info').textContent=t('auctionOver');
  const tk=++bt;run(tk).catch(e=>{if(e!==0)throw e});
}

async function run(tk){
  const z=async ms=>{await sleep(ms);if(tk!==bt)throw 0};
  const T=P.map(p=>p.c.map(c=>({...c,f:1,dead:false}))),i=[0,0],alive=p=>i[p]<T[p].length;
  const say=async(h,ms=2000)=>{$('dlg').innerHTML=h;await z(ms)};
  const setHp=(p,f)=>{const e=$('bh'+p);e.style.width=f*100+'%';e.className=f>.5?'':f>.2?'mid':'low'};
  const balls=p=>$('bb'+p).innerHTML=[0,1,2].map(k=>`<i class="${k<T[p].length?(T[p][k].dead?'x':'on'):''}"></i>`).join('');
  const fx=(p,c)=>{const s=$('bs'+p);s.className='sp';void s.offsetWidth;s.classList.add(c)};
  const enter=async p=>{const c=T[p][i[p]],s=$('bs'+p);
    s.innerHTML=spr(c);s.style.setProperty('--h',c.h);$('bn'+p).textContent=dn(c);
    setHp(p,c.f);balls(p);$('hb'+p).classList.add('show');fx(p,'in');
    await say(t('sends',p+1,dn(c)))};

  // transición
  const w=$('wipe');w.className='wipe in';await z(1100);
  document.querySelector('.board').style.display='none';
  const E=$('end');E.className='end battle';E.style.display='block';E.innerHTML=arena();scrollTo(0,0);
  await z(1000);w.className='wipe out';await z(1100);
  await say(t('fightStart'),1800);

  // salen de uno en uno
  if(alive(0))await enter(0);
  if(alive(1))await enter(1);

  while(alive(0)&&alive(1)){
    const A=T[0][i[0]],B=T[1][i[1]],ea=S(A)*A.f,eb=S(B)*B.f;
    const wp=ea===eb?Math.round(Math.random()):+(eb>ea),lp=1-wp,W=T[wp][i[wp]],L=T[lp][i[lp]];
    const rem=Math.max(.04,(Math.max(ea,eb)-Math.min(ea,eb))/S(W));
    const w0=W.f,l0=L.f;
    await say(`<b>${dn(A)}</b> ${t('vs')} <b>${dn(B)}</b>`,1600);
    for(let k=1;k<=3;k++){
      fx(lp,'atk');await z(250);fx(wp,'hit');setHp(wp,w0-(w0-rem)*k/3);await z(800);
      fx(wp,'atk');await z(250);fx(lp,'hit');setHp(lp,l0*(1-k/3));await z(800);
    }
    W.f=rem;L.f=0;L.dead=true;
    await say(t('down',dn(L)),1100);
    fx(lp,'fnt');await z(900);$('bs'+lp).innerHTML='';$('hb'+lp).classList.remove('show');balls(lp);
    await say(t('stands',dn(W),Math.round(rem*100)),1400);
    i[lp]++;if(alive(lp))await enter(lp);
  }

  const wp=alive(0)?0:alive(1)?1:-1,sv=wp<0?[]:T[wp].filter(c=>!c.dead);
  await say(wp<0?t('tie'):t('wins',wp+1),300);
  E.insertAdjacentHTML('beforeend',`<div class="res"><h2>${wp<0?t('tie'):t('winsH',wp+1)}</h2><p>${sv.map(c=>dn(c)+' '+Math.round(c.f*100)+'%').join(' · ')||t('nobody')}</p><button onclick="start('${cat}')">${t('again')}</button></div>`);
}

/* ---------- ESCALA DE PODER ---------- */
function openScale(){
  wantImg(POOLS.anime);
  const L=[...POOLS.anime].sort((a,b)=>b.pw-a.pw);
  $('scl').innerHTML=L.map((c,k)=>`<div class="sr"><span class="rk">${k+1}</span><div class="av" style="--h:${c.h}">${c.img?`<img src="${c.img}" alt="">`:c.e}</div><div><b>${dn(c)}</b><small>${an(c.a)} · ${fe(c)}</small><div class="bar2"><i style="width:${c.pw/10}%"></i></div></div><span class="pv">${c.pw}</span></div>`).join('');
  $('scale').classList.add('open');
}
function closeScale(){$('scale').classList.remove('open')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScale()});

/* ---------- FOTOS: se piden a la API pública Jikan (MyAnimeList) y se guardan en caché ---------- */
const imgOf=n=>(POOLS.anime.find(x=>x.n===n)||{}).img;
let IMGC={};try{IMGC=JSON.parse(localStorage.getItem('bvimg')||'{}')}catch(e){}
let imgQ=[],imgBusy=false;
const jk=q=>`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&order_by=favorites&sort=desc&limit=1`;
// Prioridad 1: fotos propias en la carpeta fotos/ (nombre del personaje + .jpg/.png/.webp)
async function localImg(c){for(const x of['jpg','png','webp']){const u='fotos/'+encodeURIComponent(c.n)+'.'+x;if(await new Promise(ok=>{const im=new Image();im.onload=()=>ok(1);im.onerror=()=>ok(0);im.src=u}))return u}}
async function findImg(c){
  for(const q of c.q.split('|')){
    let r=await fetch(jk(q));
    if(r.status===429){await sleep(3000);r=await fetch(jk(q))}
    if(r.ok){
      const u=((await r.json()).data||[])[0]?.images?.jpg?.image_url;
      if(u&&!/questionmark/.test(u)&&await new Promise(ok=>{const im=new Image();im.onload=()=>ok(1);im.onerror=()=>ok(0);im.src=u}))return u;
    }
    await sleep(1100);
  }
}
async function pump(){
  imgBusy=true;
  while(imgQ.length){
    const c=imgQ.shift();
    try{const l=await localImg(c);if(l){c.img=l;imgShown(c);continue}
      if(IMGC[c.n]){c.img=IMGC[c.n];imgShown(c);continue}
      const u=await findImg(c);if(u){c.img=u;IMGC[c.n]=u;try{localStorage.setItem('bvimg',JSON.stringify(IMGC))}catch(e){}imgShown(c)}}catch(e){}
    await sleep(1100);
  }
  imgBusy=false;
}
function wantImg(list,front){
  list.forEach(c=>{if(c.img)return;const k=imgQ.indexOf(c);
    if(k>=0){if(front&&k>0){imgQ.splice(k,1);imgQ.unshift(c)}return}
    if(c.done)return;c.done=true;front?imgQ.unshift(c):imgQ.push(c)});
  if(!imgBusy)pump();
}
function imgShown(c){
  if(cur&&cur.n===c.n){const e=$('pic').querySelector('.e');if(e)e.outerHTML=`<img src="${c.img}" alt="${c.n}">`}
  if(P&&P.some(p=>p.c.some(x=>x.n===c.n)))render();
  if($('scale').classList.contains('open'))openScale();
}
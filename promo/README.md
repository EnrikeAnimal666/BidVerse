# Spot promocional de BidVerse

Vídeo vertical (1080×1920, 30 fps, 33 s, H.264 + AAC) hecho 100 % con código: muñecos 3D (three.js), interfaz del juego en canvas y música/efectos sintetizados con Web Audio. No usa samples ni vídeos externos.

- `out/BidVerse_promo.mp4`: el vídeo final
- `out/BidVerse_promo_portada.jpg`: portada / miniatura
- `out/soundtrack.wav`: solo la banda sonora

## Guion

| Tiempo | Plano |
|---|---|
| 0–6 s | Leo, aburrido en el sofá ("Nivel de aburrimiento: MÁXIMO"), tiene una idea y coge el móvil |
| 6–10 s | Pantalla partida: videollamada con Dani, a quien se le escapa el móvil por los aires |
| 10–14 s | POV del móvil: escribe "bidverse", carga la web, crea sala, Dani entra. El neón del salón se enciende |
| 14–20 s | Subasta de Goku (pique de pujas, reacciones, ¡VENDIDO!) |
| 20–26 s | ¡COMBATE! Goku vs Sukuna: Santuario, Kamehameha, K.O. |
| 26–29 s | Leo celebra, Dani pide la revancha |
| 29–33 s | Cierre: logo, "Puja. Combate. Gana." y llamada a la acción |

## Volver a renderizar

Hace falta Node ≥ 22 y Google Chrome. Desde esta carpeta (`promo/`):

```bash
node tools/render.mjs BidVerse_promo.mp4 prefer-hardware bidverse-cdiy.onrender.com
```

El tercer argumento es la URL que sale en la barra del navegador y en el cierre. El render tarda ~1–2 min y escribe en `out/`.

- `node tools/stills.mjs <carpeta> "sheet:nombre:1.5,4.2,8" "still:nombre:30:1"` saca fotogramas sueltos u hojas de contacto para revisar
- `node tools/verify.mjs BidVerse_promo.mp4 hoja.jpg` comprueba que el MP4 se decodifica (duración, tamaño, audio)
- Para previsualizar en directo, sirve la carpeta raíz del proyecto con cualquier servidor estático y abre `promo/spot.html` (`?t=12` salta a ese segundo)

## Dónde tocar

- `src/main.js`: planos, cámaras, poses de los muñecos y textos superpuestos
- `src/ui.js`: pantallas del móvil y animaciones del juego (subasta, combate); el guion de tiempos está en `T` y `BIDS`
- `src/audio.js`: música, efectos y voces "galimatías" (`LINES`)
- `src/toys.js` / `src/sets.js`: muñecos y decorados

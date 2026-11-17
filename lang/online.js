// BidVerse · textos del modo online (se suman a lang/es.js y lang/en.js sin tocarlos)
(function(){
  const T={
    es:{olBtn:'Jugar online',olTitle:'Partida online',olName:'Tu nombre',olNamePh:'2-16 letras o números',olCreateAnime:'Crear sala · Anime',olCreateUfc:'Crear sala · UFC',olOr:'o entra en la sala de un amigo',
      olCodePh:'CÓDIGO',olJoin:'Entrar',olWaitTitle:'Sala creada',olWaitText:'Pasa este código o este enlace a tu rival. La partida empieza en cuanto entre.',olCopy:'Copiar enlace',olCopied:'¡Copiado!',olCancel:'Cancelar',
      olConnecting:'Conectando…',olReconnecting:'Sin conexión. Reintentando…',olPeerOff:'Tu rival se ha desconectado. La partida está en pausa.',olPeerBack:'Tu rival ha vuelto.',olPeerLeft:'Tu rival ha salido de la partida.',olTimeout:'Tu rival no volvió a tiempo. La partida se ha cancelado.',
      olKicked:'Has abierto BidVerse en otra pestaña; esta se ha desconectado.',olBackMenu:'Volver al menú',olAgainWait:'Esperando al rival…',olAgainAsk:'Tu rival quiere la revancha.',
      ol_noRoom:'Esa sala no existe.',ol_full:'La sala ya está llena.',ol_inRoom:'Ya estás en una sala.',ol_badCat:'Categoría no válida.',ol_busy:'El servidor está lleno. Prueba en un rato.',ol_server:'Error del servidor.',ol_noHello:'Conexión no iniciada.',olNoServer:'Para jugar online abre la web desde el servidor (http://localhost:3000), no desde el archivo.'},
    en:{olBtn:'Play online',olTitle:'Online game',olName:'Your name',olNamePh:'2-16 letters or numbers',olCreateAnime:'Create room · Anime',olCreateUfc:'Create room · UFC',olOr:'or join a friend’s room',
      olCodePh:'CODE',olJoin:'Join',olWaitTitle:'Room created',olWaitText:'Send this code or link to your opponent. The game starts as soon as they join.',olCopy:'Copy link',olCopied:'Copied!',olCancel:'Cancel',
      olConnecting:'Connecting…',olReconnecting:'Connection lost. Retrying…',olPeerOff:'Your opponent disconnected. The game is paused.',olPeerBack:'Your opponent is back.',olPeerLeft:'Your opponent left the game.',olTimeout:'Your opponent did not come back in time. The game was cancelled.',
      olKicked:'You opened BidVerse in another tab; this one was disconnected.',olBackMenu:'Back to menu',olAgainWait:'Waiting for opponent…',olAgainAsk:'Your opponent wants a rematch.',
      ol_noRoom:'That room does not exist.',ol_full:'The room is full.',ol_inRoom:'You are already in a room.',ol_badCat:'Invalid category.',ol_busy:'The server is full. Try again later.',ol_server:'Server error.',ol_noHello:'Connection not started.',olNoServer:'To play online open the site from the server (http://localhost:3000), not from the file.'}
  };
  for(const l in T)if(window.LANGS&&LANGS[l])Object.assign(LANGS[l].ui,T[l]);
})();

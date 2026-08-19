# Test manuali pipeline Vision a blocchi

In sviluppo, dopo ogni scansione eseguire `window.openRestMenuVisionDebug()` nella console. Verificare box, ordine di lettura, crop, confidence e indicazione del retry. In produzione la funzione e i dati debug non devono esistere.

- Una colonna: regioni verticali logiche, senza tagliare descrizioni o prezzi.
- Due colonne: ordine completo sinistra/destra; nessun prezzo attraversa le colonne.
- Tre colonne: box aderenti alle sezioni reali, non suddivisioni geometriche arbitrarie.
- Prezzi molto distanti a destra: piatto e prezzo restano nello stesso blocco o hanno un collegamento visivo esplicito.
- Font piccoli: crop ingrandito e al massimo un retry; se il testo resta illeggibile, warning e confidence bassa.
- Sfondo grafico/colorato: nessuna parola ricostruita per intuizione.
- Descrizioni multilinea: tutte le righe restano nello stesso blocco senza inglobare il piatto seguente.
- Categorie distribuite su più colonne: unione solo per nome uguale e confidence sufficiente.
- Foto inclinata: orientamento EXIF corretto; segnalare incertezza se la prospettiva compromette il layout.
- Foto iPhone ad alta risoluzione: crop nitidi e coordinate corrette dopo l'orientamento.
- Allergeni numerici e grammature (`1, 3, 7`, `250 g`): mai convertiti in prezzi.
- Più formati e prezzi: mantenuti come varianti/formati nello stesso blocco.

Per ogni caso controllare che tutte le `rawTextLines` siano usate tramite `sourceLineIds` oppure conservate in `unclassifiedText`, e che gli elementi dubbi compaiano nella revisione.

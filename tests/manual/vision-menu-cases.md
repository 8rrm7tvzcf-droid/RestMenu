# Test manuali pipeline Vision

Per ogni caso verificare immagine, trascrizione Fase A, struttura Fase B, `sourceLineIds`, confidenza e testo non classificato.

- Due colonne: completare la colonna sinistra prima della destra; nessun prezzo deve attraversare le colonne.
- Prezzi lontani a destra: associare solo prezzo sulla stessa riga/colonna e visivamente più vicino.
- Descrizioni su più righe: conservarle complete senza inglobare il piatto successivo.
- Piatti senza descrizione: lasciare descrizione vuota senza inventarla.
- Allergeni numerici: mantenere `1, 3, 7` come allergeni o testo, mai come prezzo.
- Grammature: mantenere `250 g` come formato/nota, mai come prezzo.
- Più formati e prezzi: conservare tutte le varianti separatamente.
- Font piccoli: restituire `qualityWarning` e testo parziale a confidenza bassa.
- Sfondo colorato: non normalizzare o completare parole non leggibili.

La somma delle righe usate e non classificate deve coprire tutte le righe della trascrizione.

# Condominio_App 1.0

Versione stabile promossa il 12/09/2026 dopo collaudo di terzo livello.

Questa branch rappresenta il riferimento stabile di produzione. Gli sviluppi ordinari devono continuare sulla branch `Condominio_App-1.0-test` e possono essere promossi qui solo dopo collaudo completo e OK esplicito.

Perimetro funzionale della versione stabile:
- sincronizzazione con la cartella Drive ufficiale Condomini_APP;
- archivio locale allineato ai condomini realmente presenti nella cartella Drive;
- rate ordinarie lette dal foglio Incassi;
- esclusione delle rate future;
- conguagli a debito e a credito;
- associazione prudente dei nominativi con Incassi come anagrafica ufficiale;
- gestione proprietari con più unità e varianti nominative;
- correzione V4 per la conservazione economica dei conguagli associati per variante/posizione;
- protezione contro residui ordinari da €0,01;
- spese straordinarie e spese individuali escluse in questa fase;
- selezione manuale delle voci;
- invio WhatsApp/Email e storico locale;
- aggiornamento Drive V3 con transazione, rollback e protezione di contatti/storico/configurazioni.

Baseline di accettazione superata prima della promozione:
- 11/11 condomini;
- 1.065 rate ordinarie;
- €41.471,29 totale ordinario;
- 0 rate future anomale;
- 285 conguagli;
- 0 conguagli non risolti;
- Parco San Nazario €11.192,23, incluso il trasferimento di €492,98 a GALA COSTRUZIONI SRL (JOSEPH OMORS).

Backup precedente alla promozione: `backup-stabile-pre-v4-20260912`.

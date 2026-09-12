# QA Lock - Condominio_App 1.0 test

Questa cartella protegge le funzioni che hanno già superato il collaudo prima delle prossime correzioni.

## Baseline congelata

Commit di riferimento: `cda80fd791685126a185f42370224ac4bf8d1366` sulla branch `Condominio_App-1.0-test`.

Backup di rollback: `Condominio_App-1.0-test-backup-pre-blindatura-20260911`.

La branch stabile `Condominio_App-1.0` non viene modificata da questa blindatura.

## Funzioni considerate OK e protette

- conguagli reali: 285/285 associati, 0 DA VERIFICARE;
- logica rate ordinarie già collaudata sugli 11 condomini, salvo il problema aperto di Parco del Sole;
- crediti separati e non compensati automaticamente;
- selezione individuale delle voci e ricalcolo dei totali;
- ordine dei condomini e pulizia archivio in base alla cartella Drive ufficiale;
- isolamento del numero WhatsApp per nominativo/proprietario.

## Problemi volutamente NON congelati come corretti

1. Parco del Sole: rate future/Ottobre e associazione mesi-unità.
2. Saldi e spese straordinarie non sempre associati con la stessa robustezza dei conguagli.
3. SUB, unità apparentemente duplicate e righe riepilogative scambiate per persone.

## Regola per qualsiasi modifica futura

Se cambia uno dei file runtime protetti rispetto alla baseline, il controllo automatico fallisce finché `qa/CHANGE_AUTHORIZATION.json` non elenca esattamente i file modificati e tutti i gate di regressione non vengono marcati `true` dopo il collaudo completo sugli 11 file reali.

Questo impedisce di considerare conclusa una modifica che corregge un problema ma altera silenziosamente una fase già approvata.

## Importante

I file QA non vengono caricati dall'app e quindi non cambiano né calcoli, né interfaccia, né aggiornamento Drive, né invii. Sono esclusivamente un sistema di controllo e blocco regressioni.

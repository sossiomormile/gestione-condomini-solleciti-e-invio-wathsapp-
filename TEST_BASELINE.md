# Condominio_App 1.0 - TEST

Questa branch è la nuova area di sviluppo e collaudo successiva alla promozione stabile V3+V4 del 12/09/2026.

Base di partenza identica alla stabile bloccata:
- branch stabile: `Condominio_App-1.0`
- commit stabile congelato: `0edfbdbcb8095699f5bffc2b6d80b079e6acbff4`
- snapshot immutabile di sicurezza: `Condominio_App-1.0-frozen-v4-20260912`

Regole operative:
- nessuna nuova modifica deve essere fatta direttamente sulla stabile;
- tutte le nuove modifiche vanno sviluppate qui;
- ogni modifica deve essere sottoposta a collaudo completo e regressione sugli 11 condomini;
- la stabile può essere aggiornata solo dopo OK esplicito dell'utente;
- baseline protetta: 11/11 condomini, 1.065 rate ordinarie, €41.471,29, 0 rate future anomale, 285 conguagli, 0 non risolti, Parco San Nazario €11.192,23.

La precedente TEST V3+V4 è conservata nella branch `backup-test-v3v4-20260912`.

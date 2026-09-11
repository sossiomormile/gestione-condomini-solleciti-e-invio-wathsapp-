import fs from 'node:fs';
const code=fs.readFileSync('drive-sync-v3.js','utf8');
const required=[
 ["CLANIO 2","Bilancio 2025-2026.xlsx"],
 ["DEMACOOP","2026-2027/Consuntivo 2026 - Preventivo 2027.xlsx"],
 ["DI LORENZO","2026/2026.xlsx"],
 ["DI BE","2025-2026/Consuntivo 2025 - Preventivo 2026 - MODIFICA.xlsx"],
 ["F LLI CARUSO C SO VITT EMENUELE","2026/2026-2027.xlsx"],
 ["F LLI CARUSO VIA LUPOLI","2026/2026 - da gen 26.xlsx"],
 ["PARCO GARDENIA","2026-2027/2026-2027.xlsx"],
 ["PARCO IRIS","2025/Consuntivo 2025 - Preventivo 2026.xlsx"],
 ["PARCO PANTANI","2026/Consuntivo 2026 - Preventivo 2027.xlsx"],
 ["PARCO SAN NAZARIO","2026-2027/Consuntivo 2026-2027.xlsx"],
 ["PARCO DEL SOLE","2026/Bilancio 2026.xlsx"]
];
if(!code.includes("ROOT_FOLDER_ID='1ZE0blT7_qZzxdJL54uGhZfsaFIVUk9up'"))throw new Error('Root Condomini_APP errata');
for(const [name,path] of required){const marker=`'${name}':'${path}'`;if(!code.includes(marker))throw new Error('Regola bilancio ufficiale mancante: '+name+' -> '+path)}
if(!code.includes("return{state:'error',error:new Error('Bilancio atteso non trovato: '+rule)"))throw new Error('Una regola pin mancata non blocca il refresh');
console.log('SOURCE RULES V3 TEST PASSED');

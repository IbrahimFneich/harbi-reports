/* ============================================================
   aliases.js — Shared English→Arabic alias dictionary
   Used by spotlight search and report-page search bar to
   translate user input into Arabic canonical search terms.

   Exports:
     SEARCH_ALIASES      — merged object { englishKey: 'عربي' }
     ALIAS_KEYS_SORTED   — keys sorted by length desc (multi-word first)
     resolveAliases(q)   — replace alias keys in query with Arabic
   ============================================================ */

// ── WEAPONS ───────────────────────────────────────────────────
var _WEAPONS = {
  'merkava':               '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  'tank':                  '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  'tanks':                 '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  'fpv':                   '\u0645\u0633\u064A\u0651\u0631\u0629 \u0627\u0646\u0642\u0636\u0627\u0636\u064A\u0629',
  'kamikaze drone':        '\u0645\u0633\u064A\u0651\u0631\u0629 \u0627\u0646\u0642\u0636\u0627\u0636\u064A\u0629',
  'drone':                 '\u0645\u0633\u064A\u0651\u0631\u0629',
  'drones':                '\u0645\u0633\u064A\u0651\u0631\u0629',
  'uav':                   '\u0645\u0633\u064A\u0651\u0631\u0629',
  'uavs':                  '\u0645\u0633\u064A\u0651\u0631\u0629',
  'ballistic missile':     '\u0635\u0627\u0631\u0648\u062E \u0628\u0627\u0644\u0633\u062A\u064A',
  'ballistic':             '\u0635\u0627\u0631\u0648\u062E \u0628\u0627\u0644\u0633\u062A\u064A',
  'guided missile':        '\u0635\u0627\u0631\u0648\u062E \u0645\u0648\u062C\u0647',
  'atgm':                  '\u0635\u0627\u0631\u0648\u062E \u0645\u0648\u062C\u0647',
  'anti tank':             '\u0635\u0627\u0631\u0648\u062E \u0645\u0648\u062C\u0647',
  'missile':               '\u0635\u0627\u0631\u0648\u062E',
  'missiles':              '\u0635\u0648\u0627\u0631\u064A\u062E',
  'rocket':                '\u0635\u0648\u0627\u0631\u064A\u062E',
  'rockets':               '\u0635\u0648\u0627\u0631\u064A\u062E',
  'katyusha':              '\u0643\u0627\u062A\u064A\u0648\u0634\u0627',
  'rpg':                   '\u0642\u0630\u064A\u0641\u0629 \u0635\u0627\u0631\u0648\u062E\u064A\u0629',
  'mortars':               '\u0647\u0627\u0648\u0646',
  'mortar':                '\u0647\u0627\u0648\u0646',
  'artillery':             '\u0645\u062F\u0641\u0639\u064A\u0629',
  'shelling':              '\u0642\u0635\u0641 \u0645\u062F\u0641\u0639\u064A',
  'shells':                '\u0642\u0630\u064A\u0641\u0629',
  'shell':                 '\u0642\u0630\u064A\u0641\u0629',
  'projectile':            '\u0642\u0630\u064A\u0641\u0629',
  'sniper fire':           '\u0642\u0646\u0635',
  'sniper':                '\u0642\u0646\u0635',
  'explosive':             '\u0639\u0628\u0648\u0629 \u0646\u0627\u0633\u0641\u0629',
  'ied':                   '\u0639\u0628\u0648\u0629 \u0646\u0627\u0633\u0641\u0629',
  'bomb':                  '\u0639\u0628\u0648\u0629 \u0646\u0627\u0633\u0641\u0629',
  'landmine':              '\u0644\u063A\u0645',
  'mine':                  '\u0644\u063A\u0645',
  'claymore':              '\u0644\u063A\u0645',
  'torpedo':               '\u0637\u0648\u0631\u0628\u064A\u062F',
  'barija':                '\u0628\u0627\u0631\u062C\u0629',
  'warship':               '\u0628\u0627\u0631\u062C\u0629',
  'battleship':            '\u0628\u0627\u0631\u062C\u0629',
  'ship':                  '\u0628\u0627\u0631\u062C\u0629',
  'naval':                 '\u0628\u062D\u0631\u064A\u0629',
  'machine gun':           '\u0631\u0634\u0627\u0634',
  'mg':                    '\u0631\u0634\u0627\u0634',
  'firearm':               '\u0633\u0644\u0627\u062D',
  'rifle':                 '\u0633\u0644\u0627\u062D',
  'gun':                   '\u0633\u0644\u0627\u062D',
  'kornet':                '\u0643\u0648\u0631\u0646\u064A\u062A',
  'cornet':                '\u0643\u0648\u0631\u0646\u064A\u062A',
  'tandem':                '\u0634\u062D\u0646\u0629 \u062A\u0631\u0627\u062F\u0641\u064A\u0629',
  'iron dome':             '\u0627\u0644\u0642\u0628\u0629 \u0627\u0644\u062D\u062F\u064A\u062F\u064A\u0629',
  'interceptor':           '\u0627\u0639\u062A\u0631\u0627\u0636\u064A',
  'air defense':           '\u062F\u0641\u0627\u0639 \u062C\u0648\u064A',
  'sam':                   '\u062F\u0641\u0627\u0639 \u062C\u0648\u064A',
  'volcano':               '\u0628\u0631\u0643\u0627\u0646',
  'burkan':                '\u0628\u0631\u0643\u0627\u0646'
};

// ── LOCATIONS — PALESTINE ──────────────────────────────────────
var _LOCATIONS_PALESTINE = {
  'gaza strip':            '\u0642\u0637\u0627\u0639 \u063A\u0632\u0629',
  'gaza city':             '\u063A\u0632\u0629',
  'gaza':                  '\u063A\u0632\u0629',
  'rafah':                 '\u0631\u0641\u062D',
  'khan younis':           '\u062E\u0627\u0646 \u064A\u0648\u0646\u0633',
  'khan yunis':            '\u062E\u0627\u0646 \u064A\u0648\u0646\u0633',
  'khanyounis':            '\u062E\u0627\u0646 \u064A\u0648\u0646\u0633',
  'jabaliya':              '\u062C\u0628\u0627\u0644\u064A\u0627',
  'jabalia':               '\u062C\u0628\u0627\u0644\u064A\u0627',
  'beit hanoun':           '\u0628\u064A\u062A \u062D\u0627\u0646\u0648\u0646',
  'beit hanun':            '\u0628\u064A\u062A \u062D\u0627\u0646\u0648\u0646',
  'netzarim corridor':     '\u0645\u062D\u0648\u0631 \u0646\u062A\u0633\u0627\u0631\u064A\u0645',
  'netzarim axis':         '\u0645\u062D\u0648\u0631 \u0646\u062A\u0633\u0627\u0631\u064A\u0645',
  'philadelphi corridor':  '\u0645\u062D\u0648\u0631 \u0641\u064A\u0644\u0627\u062F\u0644\u0641\u064A',
  'philadelphi':           '\u0645\u062D\u0648\u0631 \u0641\u064A\u0644\u0627\u062F\u0644\u0641\u064A',
  'nuseirat':              '\u0627\u0644\u0646\u0635\u064A\u0631\u0627\u062A',
  'nusseirat':             '\u0627\u0644\u0646\u0635\u064A\u0631\u0627\u062A',
  'deir al balah':         '\u062F\u064A\u0631 \u0627\u0644\u0628\u0644\u062D',
  'deir elbalah':          '\u062F\u064A\u0631 \u0627\u0644\u0628\u0644\u062D',
  'bureij':                '\u0627\u0644\u0628\u0631\u064A\u062C',
  'buraij':                '\u0627\u0644\u0628\u0631\u064A\u062C',
  'maghazi':               '\u0627\u0644\u0645\u063A\u0627\u0632\u064A',
  'shejaiya':              '\u0627\u0644\u0634\u062C\u0627\u0639\u064A\u0629',
  'shujaiya':              '\u0627\u0644\u0634\u062C\u0627\u0639\u064A\u0629',
  'shujaya':               '\u0627\u0644\u0634\u062C\u0627\u0639\u064A\u0629',
  'zeitoun':               '\u0627\u0644\u0632\u064A\u062A\u0648\u0646',
  'tel alhawa':            '\u062A\u0644 \u0627\u0644\u0647\u0648\u0649',
  'tal al hawa':           '\u062A\u0644 \u0627\u0644\u0647\u0648\u0649',
  'netsarim':              '\u0646\u062A\u0633\u0627\u0631\u064A\u0645',
  'netzarim':              '\u0646\u062A\u0633\u0627\u0631\u064A\u0645',
  'west bank':             '\u0627\u0644\u0636\u0641\u0629 \u0627\u0644\u063A\u0631\u0628\u064A\u0629',
  'al quds':               '\u0627\u0644\u0642\u062F\u0633',
  'jerusalem':             '\u0627\u0644\u0642\u062F\u0633',
  'jenin':                 '\u062C\u0646\u064A\u0646',
  'nablus':                '\u0646\u0627\u0628\u0644\u0633',
  'tulkarem':              '\u0637\u0648\u0644\u0643\u0631\u0645',
  'tulkarm':               '\u0637\u0648\u0644\u0643\u0631\u0645',
  'al khalil':             '\u0627\u0644\u062E\u0644\u064A\u0644',
  'hebron':                '\u0627\u0644\u062E\u0644\u064A\u0644',
  'ramallah':              '\u0631\u0627\u0645 \u0627\u0644\u0644\u0647',
  'bethlehem':             '\u0628\u064A\u062A \u0644\u062D\u0645'
};

// ── LOCATIONS — ISRAEL ─────────────────────────────────────────
var _LOCATIONS_ISRAEL = {
  'kiryat shmona':         '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629',
  'rishon lezion':         '\u0631\u064A\u0634\u0648\u0646',
  'upper galilee':         '\u0627\u0644\u062C\u0644\u064A\u0644',
  'golan heights':         '\u0627\u0644\u062C\u0648\u0644\u0627\u0646',
  'beer sheva':            '\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639',
  'beit shemesh':          '\u0628\u064A\u062A \u0634\u064A\u0645\u0634',
  'mount meron':           '\u062C\u0628\u0644 \u0645\u064A\u0631\u0648\u0646',
  'ramat naftali':         '\u0631\u0627\u0645\u0648\u062A \u0646\u0641\u062A\u0627\u0644\u064A',
  'kerem abu salem':       '\u0643\u0631\u0645 \u0623\u0628\u0648 \u0633\u0627\u0644\u0645',
  'kerem shalom':          '\u0643\u0631\u0645 \u0623\u0628\u0648 \u0633\u0627\u0644\u0645',
  'beersheba':             '\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639',
  'tel aviv':              '\u062A\u0644 \u0623\u0628\u064A\u0628',
  'telaviv':               '\u062A\u0644 \u0623\u0628\u064A\u0628',
  'ashkelon':              '\u0639\u0633\u0642\u0644\u0627\u0646',
  'asqalan':               '\u0639\u0633\u0642\u0644\u0627\u0646',
  'nahariya':              '\u0646\u0647\u0627\u0631\u064A\u0627',
  'herzliya':              '\u0647\u0631\u062A\u0633\u0644\u064A\u0627',
  'nazareth':              '\u0627\u0644\u0646\u0627\u0635\u0631\u0629',
  'tiberias':              '\u0637\u0628\u0631\u064A\u0627',
  'tverya':                '\u0637\u0628\u0631\u064A\u0627',
  'haifa':                 '\u062D\u064A\u0641\u0627',
  'ashdod':                '\u0627\u0633\u062F\u0648\u062F',
  'sderot':                '\u0633\u062F\u064A\u0631\u0648\u062A',
  'kiryat':                '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629',
  'metulla':               '\u0627\u0644\u0645\u0637\u0644\u0629',
  'metula':                '\u0627\u0644\u0645\u0637\u0644\u0629',
  'tzfat':                 '\u0635\u0641\u062F',
  'zefat':                 '\u0635\u0641\u062F',
  'safed':                 '\u0635\u0641\u062F',
  'akko':                  '\u0639\u0643\u0627',
  'akka':                  '\u0639\u0643\u0627',
  'acre':                  '\u0639\u0643\u0627',
  'galilee':               '\u0627\u0644\u062C\u0644\u064A\u0644',
  'golan':                 '\u0627\u0644\u062C\u0648\u0644\u0627\u0646',
  'netanya':               '\u0646\u062A\u0627\u0646\u064A\u0627',
  'netivot':               '\u0646\u062A\u064A\u0641\u0648\u062A',
  'ofakim':                '\u0623\u0648\u0641\u0627\u0643\u064A\u0645',
  'eilat':                 '\u0625\u064A\u0644\u0627\u062A',
  'dimona':                '\u062F\u064A\u0645\u0648\u0646\u0627',
  'negev':                 '\u0627\u0644\u0646\u0642\u0628',
  'avivim':                '\u0623\u0641\u064A\u0641\u064A\u0645',
  'shlomi':                '\u0634\u0644\u0648\u0645\u064A',
  'doveif':                '\u062F\u0648\u0641\u064A\u0641',
  'dovev':                 '\u062F\u0648\u0641\u064A\u0641',
  'margaliot':             '\u0645\u0631\u063A\u0644\u064A\u0648\u062A',
  'manara':                '\u0627\u0644\u0645\u0646\u0627\u0631\u0629',
  'meron':                 '\u062C\u0628\u0644 \u0645\u064A\u0631\u0648\u0646',
  'dishon':                '\u062F\u064A\u0634\u0648\u0646',
  'hanita':                '\u062D\u0646\u064A\u062A\u0627',
  'erez':                  '\u0625\u064A\u0631\u0632',
  'rishon':                '\u0631\u064A\u0634\u0648\u0646'
};

// ── LOCATIONS — LEBANON ────────────────────────────────────────
var _LOCATIONS_LEBANON = {
  'south lebanon':         '\u062C\u0646\u0648\u0628 \u0644\u0628\u0646\u0627\u0646',
  'shebaa farms':          '\u0645\u0632\u0627\u0631\u0639 \u0634\u0628\u0639\u0627',
  'aita al shaab':         '\u0639\u064A\u062A\u0627 \u0627\u0644\u0634\u0639\u0628',
  'kafr shuba':            '\u0643\u0641\u0631\u0634\u0648\u0628\u0627',
  'kfar shouba':           '\u0643\u0641\u0631\u0634\u0648\u0628\u0627',
  'maroun al ras':         '\u0645\u0627\u0631\u0648\u0646 \u0627\u0644\u0631\u0627\u0633',
  'litani river':          '\u0627\u0644\u0644\u064A\u0637\u0627\u0646\u064A',
  'bint jbeil':            '\u0628\u0646\u062A \u062C\u0628\u064A\u0644',
  'bint jbail':            '\u0628\u0646\u062A \u062C\u0628\u064A\u0644',
  'nabatieh':              '\u0627\u0644\u0646\u0628\u0637\u064A\u0629',
  'nabatieh':              '\u0627\u0644\u0646\u0628\u0637\u064A\u0629',
  'nabatiyeh':             '\u0627\u0644\u0646\u0628\u0637\u064A\u0629',
  'baalbeck':              '\u0628\u0639\u0644\u0628\u0643',
  'baalbek':               '\u0628\u0639\u0644\u0628\u0643',
  'dahiyeh':               '\u0627\u0644\u0636\u0627\u062D\u064A\u0629',
  'dahiya':                '\u0627\u0644\u0636\u0627\u062D\u064A\u0629',
  'shebaa':                '\u0645\u0632\u0627\u0631\u0639 \u0634\u0628\u0639\u0627',
  'lebanon':               '\u0644\u0628\u0646\u0627\u0646',
  'beirut':                '\u0628\u064A\u0631\u0648\u062A',
  'litani':                '\u0627\u0644\u0644\u064A\u0637\u0627\u0646\u064A',
  'khiam':                 '\u0627\u0644\u062E\u064A\u0627\u0645',
  'al khiam':              '\u0627\u0644\u062E\u064A\u0627\u0645',
  'maroun':                '\u0645\u0627\u0631\u0648\u0646 \u0627\u0644\u0631\u0627\u0633',
  'sidon':                 '\u0635\u064A\u062F\u0627',
  'saida':                 '\u0635\u064A\u062F\u0627',
  'sour':                  '\u0635\u0648\u0631',
  'tyre':                  '\u0635\u0648\u0631',
  'aita':                  '\u0639\u064A\u062A\u0627 \u0627\u0644\u0634\u0639\u0628',
  'yaroun':                '\u064A\u0627\u0631\u0648\u0646',
  'aitaroun':              '\u0639\u064A\u062A\u0631\u0648\u0646',
  'markaba':               '\u0645\u0631\u0643\u0628\u0627',
  'houla':                 '\u062D\u0648\u0644\u0627',
  'taybeh':                '\u0627\u0644\u0637\u064A\u0628\u0629',
  'blida':                 '\u0628\u0644\u064A\u062F\u0627',
  'rmeish':                '\u0631\u0645\u064A\u0634',
  'naqoura':               '\u0627\u0644\u0646\u0627\u0642\u0648\u0631\u0629',
  'adaisseh':              '\u0627\u0644\u0639\u062F\u064A\u0633\u0629',
  'adaisee':               '\u0627\u0644\u0639\u062F\u064A\u0633\u0629'
};

// ── LOCATIONS — REGIONAL ──────────────────────────────────────
var _LOCATIONS_REGIONAL = {
  'red sea':               '\u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631',
  "sana'a":                '\u0635\u0646\u0639\u0627\u0621',
  'sanaa':                 '\u0635\u0646\u0639\u0627\u0621',
  'tehran':                '\u0637\u0647\u0631\u0627\u0646',
  'baghdad':               '\u0628\u063A\u062F\u0627\u062F',
  'damascus':              '\u062F\u0645\u0634\u0642',
  'jordan':                '\u0627\u0644\u0623\u0631\u062F\u0646',
  'egypt':                 '\u0645\u0635\u0631',
  'syria':                 '\u0633\u0648\u0631\u064A\u0627',
  'iraq':                  '\u0627\u0644\u0639\u0631\u0627\u0642',
  'iran':                  '\u0625\u064A\u0631\u0627\u0646',
  'yemen':                 '\u0627\u0644\u064A\u0645\u0646'
};

// ── MILITARY OPERATIONS ────────────────────────────────────────
var _MILITARY = {
  'air strike':            '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629',
  'air raid':              '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629',
  'airstrike':             '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629',
  'direct hit':            '\u0625\u0635\u0627\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629',
  'deep strike':           '\u0636\u0631\u0628\u0629 \u0639\u0645\u0642',
  'ceasefire':             '\u0648\u0642\u0641 \u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0631',
  'operation':             '\u0639\u0645\u0644\u064A\u0629',
  'op':                    '\u0639\u0645\u0644\u064A\u0629',
  'ambush':                '\u0643\u0645\u064A\u0646',
  'assault':               '\u0647\u062C\u0648\u0645',
  'attack':                '\u0647\u062C\u0648\u0645',
  'bombardment':           '\u0642\u0635\u0641',
  'bombing':               '\u0642\u0635\u0641',
  'barrage':               '\u0642\u0635\u0641 \u0645\u062F\u0641\u0639\u064A',
  'incursion':             '\u0627\u062C\u062A\u064A\u0627\u062D',
  'raid':                  '\u0627\u062C\u062A\u064A\u0627\u062D',
  'siege':                 '\u062D\u0635\u0627\u0631',
  'clashes':               '\u0627\u0634\u062A\u0628\u0627\u0643',
  'clash':                 '\u0627\u0634\u062A\u0628\u0627\u0643',
  'battle':                '\u0645\u0639\u0631\u0643\u0629',
  'infiltration':          '\u062A\u0633\u0644\u0644',
  'targeting':             '\u0627\u0633\u062A\u0647\u062F\u0627\u0641',
  'target':                '\u0627\u0633\u062A\u0647\u062F\u0627\u0641',
  'destroy':               '\u062A\u062F\u0645\u064A\u0631',
  'destruction':           '\u062A\u062F\u0645\u064A\u0631',
  'withdrawal':            '\u0627\u0646\u0633\u062D\u0627\u0628',
  'retreat':               '\u0627\u0646\u0633\u062D\u0627\u0628',
  'truce':                 '\u0647\u062F\u0646\u0629',
  'captive':               '\u0623\u0633\u064A\u0631',
  'prisoner':              '\u0623\u0633\u064A\u0631',
  'pow':                   '\u0623\u0633\u064A\u0631',
  'hostages':              '\u0631\u0647\u064A\u0646\u0629',
  'hostage':               '\u0631\u0647\u064A\u0646\u0629'
};

// ── CASUALTIES ────────────────────────────────────────────────
var _CASUALTIES = {
  'martyr':                '\u0634\u0647\u062F\u0627\u0621',
  'martyrs':               '\u0634\u0647\u062F\u0627\u0621',
  'shaheed':               '\u0634\u0647\u062F\u0627\u0621',
  'deaths':                '\u0642\u062A\u0644\u0649',
  'dead':                  '\u0642\u062A\u0644\u0649',
  'killed':                '\u0642\u062A\u0644\u0649',
  'wounded':               '\u062C\u0631\u062D\u0649',
  'injured':               '\u062C\u0631\u062D\u0649',
  'casualties':            '\u0625\u0635\u0627\u0628\u0627\u062A',
  'destroyed':             '\u062A\u062F\u0645\u064A\u0631',
  'sirens':                '\u0635\u0641\u0627\u0631\u0627\u062A',
  'siren':                 '\u0635\u0641\u0627\u0631\u0627\u062A',
  'alarm':                 '\u0635\u0641\u0627\u0631\u0627\u062A',
  'alert':                 '\u0625\u0646\u0630\u0627\u0631',
  'warning':               '\u0625\u0646\u0630\u0627\u0631',
  'evacuation':            '\u0625\u062E\u0644\u0627\u0621',
  'displaced':             '\u0646\u0632\u0648\u062D',
  'displacement':          '\u0646\u0632\u0648\u062D',
  'massacre':              '\u0645\u062C\u0632\u0631\u0629'
};

// ── GROUPS & FACTIONS ─────────────────────────────────────────
var _GROUPS = {
  'qassam brigades':       '\u0627\u0644\u0642\u0633\u0627\u0645',
  'islamic resistance':    '\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A\u0629',
  'islamic jihad':         '\u0627\u0644\u062C\u0647\u0627\u062F \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A',
  'ansar allah':           '\u0623\u0646\u0635\u0627\u0631 \u0627\u0644\u0644\u0647',
  'occupation army':       '\u062C\u064A\u0634 \u0627\u0644\u0627\u062D\u062A\u0644\u0627\u0644',
  'revolutionary guard':   '\u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A',
  'israeli army':          '\u062C\u064A\u0634 \u0627\u0644\u0627\u062D\u062A\u0644\u0627\u0644',
  'settler':               '\u0645\u0633\u062A\u0648\u0637\u0646\u0648\u0646',
  'settlers':              '\u0645\u0633\u062A\u0648\u0637\u0646\u0648\u0646',
  'hezballah':             '\u062D\u0632\u0628 \u0627\u0644\u0644\u0647',
  'hezbollah':             '\u062D\u0632\u0628 \u0627\u0644\u0644\u0647',
  'resistance':            '\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629',
  'houthis':               '\u0623\u0646\u0635\u0627\u0631 \u0627\u0644\u0644\u0647',
  'houthi':                '\u0623\u0646\u0635\u0627\u0631 \u0627\u0644\u0644\u0647',
  'qassam':                '\u0627\u0644\u0642\u0633\u0627\u0645',
  'hamas':                 '\u0627\u0644\u0642\u0633\u0627\u0645',
  'irgc':                  '\u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A',
  'pij':                   '\u0627\u0644\u062C\u0647\u0627\u062F \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A',
  'pflp':                  '\u0627\u0644\u062C\u0628\u0647\u0629 \u0627\u0644\u0634\u0639\u0628\u064A\u0629',
  'idf':                   '\u062C\u064A\u0634 \u0627\u0644\u0627\u062D\u062A\u0644\u0627\u0644',
  'mossad':                '\u0627\u0644\u0645\u0648\u0633\u0627\u062F',
  'shabak':                '\u0627\u0644\u0634\u0627\u0628\u0627\u0643',
  'shin bet':              '\u0627\u0644\u0634\u0627\u0628\u0627\u0643',
  'netanyahu':             '\u0646\u062A\u0646\u064A\u0627\u0647\u0648',
  'bibi':                  '\u0646\u062A\u0646\u064A\u0627\u0647\u0648',
  'gallant':               '\u063A\u0627\u0644\u0627\u0646\u062A',
  'nasrallah':             '\u0646\u0635\u0631\u0627\u0644\u0644\u0647',
  'sinwar':                '\u0627\u0644\u0633\u0646\u0648\u0627\u0631',
  'haniyeh':               '\u0647\u0646\u064A\u0629',
  'zionist':               '\u0627\u0644\u0627\u062D\u062A\u0644\u0627\u0644',
  'occupation':            '\u0627\u0644\u0627\u062D\u062A\u0644\u0627\u0644'
};

// ── MILITARY UNITS & INFRASTRUCTURE ───────────────────────────
var _UNITS = {
  'military base':         '\u0642\u0627\u0639\u062F\u0629 \u0639\u0633\u0643\u0631\u064A\u0629',
  'special forces':        '\u0642\u0648\u0627\u062A \u062E\u0627\u0635\u0629',
  'base':                  '\u0642\u0627\u0639\u062F\u0629',
  'barracks':              '\u062B\u0643\u0646\u0629',
  'outpost':               '\u0645\u0648\u0642\u0639',
  'position':              '\u0645\u0648\u0642\u0639',
  'colony':                '\u0645\u0633\u062A\u0648\u0637\u0646\u0629',
  'settlement':            '\u0645\u0633\u062A\u0648\u0637\u0646\u0629',
  'checkpoint':            '\u062D\u0627\u062C\u0632',
  'brigade':               '\u0644\u0648\u0627\u0621',
  'battalion':             '\u0643\u062A\u064A\u0628\u0629',
  'division':              '\u0641\u0631\u0642\u0629',
  'platoon':               '\u0641\u0635\u064A\u0644',
  'troops':                '\u062C\u0646\u0648\u062F',
  'soldiers':              '\u062C\u0646\u0648\u062F',
  'officers':              '\u0636\u0628\u0627\u0637',
  'commando':              '\u0642\u0648\u0627\u062A \u062E\u0627\u0635\u0629'
};

// ── ARABIC VARIANTS (normalise informal/misspelled Arabic) ─────
var _ARABIC_VARIANTS = {
  '\u062F\u0628\u0627\u0628\u0629':   '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  '\u062F\u0628\u0627\u0628\u0647':   '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  '\u0635\u0641\u0627\u0631\u0629':   '\u0635\u0641\u0627\u0631\u0627\u062A',
  '\u0627\u0646\u0630\u0627\u0631':   '\u0625\u0646\u0630\u0627\u0631',
  '\u0627\u064A\u0631\u0627\u0646':   '\u0625\u064A\u0631\u0627\u0646',
  '\u064A\u0645\u0646':               '\u0627\u0644\u064A\u0645\u0646',
  '\u0639\u0631\u0627\u0642':         '\u0627\u0644\u0639\u0631\u0627\u0642',
  '\u062C\u0648\u0644\u0627\u0646':   '\u0627\u0644\u062C\u0648\u0644\u0627\u0646',
  '\u0642\u062F\u0633':               '\u0627\u0644\u0642\u062F\u0633',
  '\u0644\u064A\u0637\u0627\u0646\u064A': '\u0627\u0644\u0644\u064A\u0637\u0627\u0646\u064A',
  '\u062E\u064A\u0627\u0645':         '\u0627\u0644\u062E\u064A\u0627\u0645',
  '\u0642\u062A\u064A\u0644':         '\u0642\u062A\u0644\u0649',
  '\u0645\u0642\u062A\u0644':         '\u0642\u062A\u0644\u0649',
  '\u062C\u0631\u064A\u062D':         '\u062C\u0631\u062D\u0649',
  '\u0625\u0635\u0627\u0628\u0629':   '\u0625\u0635\u0627\u0628\u0627\u062A',
  '\u0645\u0633\u062A\u0648\u0637\u0646\u0647': '\u0645\u0633\u062A\u0648\u0637\u0646\u0629',
  '\u0642\u0627\u0639\u062F\u0647':   '\u0642\u0627\u0639\u062F\u0629',
  '\u0645\u062F\u0641\u0639\u064A\u0647': '\u0645\u062F\u0641\u0639\u064A\u0629',
  '\u062A\u062D\u0630\u064A\u0631':   '\u0625\u0646\u0630\u0627\u0631'
};

// ── Merge all categories into one exported object ─────────────
export var SEARCH_ALIASES = Object.assign(
  {},
  _WEAPONS,
  _LOCATIONS_PALESTINE,
  _LOCATIONS_ISRAEL,
  _LOCATIONS_LEBANON,
  _LOCATIONS_REGIONAL,
  _MILITARY,
  _CASUALTIES,
  _GROUPS,
  _UNITS,
  _ARABIC_VARIANTS
);

// ── Keys sorted by length descending (multi-word terms first) ──
export var ALIAS_KEYS_SORTED = Object.keys(SEARCH_ALIASES).sort(function (a, b) {
  return b.length - a.length;
});

// ── resolveAliases — replace all alias keys with Arabic forms ──
// Single-pass replacement via regex — prevents double-translation where a
// replacement value contains a substring matching a later alias key.
export function resolveAliases(q) {
  var s = q.toLowerCase();
  // Build regex from all keys (already sorted longest first to prevent partial matches)
  var escaped = ALIAS_KEYS_SORTED.map(function(k) {
    return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  var pattern = new RegExp('(' + escaped.join('|') + ')', 'gi');
  return s.replace(pattern, function(match) {
    return SEARCH_ALIASES[match.toLowerCase()] || match;
  });
}

// Static freshwater-aquarium guidance shown in the FAQ and Tips sections.

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Ako často mám meniť vodu?',
    a: 'Pre bežné akvárium vymeň 20–30 % vody raz týždenne. Vodu z vodovodu uprav kondicionérom (odstráni chlór) a prispôsob jej teplotu vode v akváriu.',
  },
  {
    q: 'Koľko mám kŕmiť?',
    a: 'Toľko, koľko ryby zjedia za 2–3 minúty, 1–2× denne. Jeden deň v týždni bez krmiva nevadí. Prekrmovanie zvyšuje amoniak a dusitany vo vode.',
  },
  {
    q: 'Ako dlho má svietiť svetlo?',
    a: 'Zvyčajne 8–10 hodín denne. Dlhšie svietenie podporuje rast rias. Najjednoduchšie je zapínať svetlo časovačom vždy v rovnaký čas.',
  },
  {
    q: 'Čo je dusíkový cyklus?',
    a: 'Ryby a zvyšky krmiva vytvárajú amoniak (NH₃/NH₄). Baktérie vo filtri ho menia na dusitany (NO₂) a potom na menej škodlivé dusičnany (NO₃). V novom akváriu trvá 4–6 týždňov, kým sa tieto baktérie usadia.',
  },
  {
    q: 'Prečo mi v novom akváriu uhynula ryba?',
    a: 'Najčastejšie pre nedokončený dusíkový cyklus (skok amoniaku alebo dusitanov), stres z prevozu alebo chorobu z obchodu. Testuj NH₃ a NO₂, ryby pridávaj postupne a uhynutú rybu hneď vyber.',
  },
  {
    q: 'Ako často čistiť filter?',
    a: 'Približne raz za 2–4 týždne. Náplň len prepláchni vo vode vypustenej z akvária, nie pod kohútikom – chlór zničí užitočné baktérie. Nikdy nemeň všetky náplne naraz.',
  },
  {
    q: 'Aké hodnoty vody sú bezpečné?',
    a: 'Amoniak 0, dusitany 0, dusičnany pod 20–40 mg/l. Vhodné pH a tvrdosť závisia od druhu – gupkám vyhovuje pH 7,0–8,0 a tvrdšia voda.',
  },
  {
    q: 'Koľko rýb sa mi zmestí do akvária?',
    a: 'Hrubé pravidlo pre malé ryby: približne 1 cm dospelej ryby na 1–2 litre vody. Veľa závisí od filtra, rastlín a správania druhu, preto pridávaj ryby postupne a sleduj hodnoty vody.',
  },
];

export const TIPS: { title: string; emoji: string; points: string[] }[] = [
  {
    title: 'Výmena vody',
    emoji: '💧',
    points: [
      'Pri výmene odsávaj aj nečistoty zo dna (odkalovač).',
      'Novú vodu vždy uprav kondicionérom.',
      'Teplota novej vody by sa mala líšiť najviac o 1–2 °C.',
    ],
  },
  {
    title: 'Kŕmenie',
    emoji: '🐟',
    points: [
      'Menej je viac – zvyšky krmiva odstráň.',
      'Striedaj vločky s mrazeným alebo živým krmivom.',
      'Pred dovolenkou ryby neprekrmuj, zdravé ryby vydržia pár dní bez jedla.',
    ],
  },
  {
    title: 'Filter',
    emoji: '🌀',
    points: [
      'Filter nechaj bežať nonstop – baktérie v ňom potrebujú prúd vody.',
      'Náplne preplachuj vo vode z akvária.',
      'Ak filter slabne, je čas ho vyčistiť.',
    ],
  },
  {
    title: 'Nové ryby',
    emoji: '🛍️',
    points: [
      'Vrecko s rybou nechaj 15–20 minút plávať na hladine, aby sa vyrovnala teplota.',
      'Postupne do vrecka prilievaj vodu z akvária.',
      'Rybu prenes sieťkou – vodu z obchodu do akvária nevylievaj.',
      'Nepridávaj veľa rýb naraz, filter si musí zvyknúť.',
    ],
  },
  {
    title: 'Gupky',
    emoji: '🧡',
    points: [
      'Vyhovuje im teplota 22–28 °C a pH 7,0–8,0.',
      'Na jedného samca daj 2–3 samice, inak samce samice vyčerpávajú.',
      'Sú živorodé – ak chceš mladé, daj im husté rastliny na úkryt.',
    ],
  },
  {
    title: 'Riasy',
    emoji: '🌿',
    points: [
      'Skráť svietenie a nestavaj akvárium na priame slnko.',
      'Prekrmovanie a staré dusičnany riasy podporujú.',
      'Živé rastliny súperia s riasami o živiny.',
    ],
  },
];

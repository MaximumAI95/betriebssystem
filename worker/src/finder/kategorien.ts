// Gliederung der gefundenen Betriebe in Bereiche und Kategorien.
// Zuerst feste Regeln (OSM-Tags, Google-Typen, Firmenname). Nur was die Regeln
// nicht sicher zuordnen, geht optional an Claude (siehe claude.ts).

export const BEREICHE = {
  handwerk: { label: 'Handwerk & Bau', passung: 'hoch' },
  kfz: { label: 'Kfz', passung: 'hoch' },
  gesundheit: { label: 'Gesundheit & Pflege', passung: 'mittel' },
  beauty: { label: 'Beauty & Wellness', passung: 'mittel' },
  dienstleistung: { label: 'Büro & Dienstleistung', passung: 'mittel' },
  gastronomie: { label: 'Gastronomie & Hotel', passung: 'mittel' },
  freizeit_bildung: { label: 'Sport, Freizeit & Bildung', passung: 'niedrig' },
  einzelhandel: { label: 'Einzelhandel', passung: 'niedrig' },
  sonstige: { label: 'Sonstige', passung: 'niedrig' },
} as const;

export type Bereich = keyof typeof BEREICHE;
export type Passung = 'hoch' | 'mittel' | 'niedrig';
export const BEREICH_SCHLUESSEL = Object.keys(BEREICHE) as Bereich[];

export type Zuordnung = {
  bereich: Bereich;
  kategorie: string;
  passung: Passung;
  /** true = aus eindeutigen Tags/Typen; false = nur geraten (Name) oder unbekannt */
  sicher: boolean;
  /** Betrieb gehört nicht in die Akquise (Behörde, Schule, Kette, Parkplatz …) */
  ausschluss?: string;
};

type Regel = [Bereich, string];

// OpenStreetMap: Schlüssel=Wert → Bereich, Kategorie
const OSM: Record<string, Record<string, Regel>> = {
  craft: {
    electrician: ['handwerk', 'Elektroinstallateur'],
    plumber: ['handwerk', 'Sanitär, Heizung, Klima'],
    hvac: ['handwerk', 'Sanitär, Heizung, Klima'],
    heating_engineer: ['handwerk', 'Sanitär, Heizung, Klima'],
    carpenter: ['handwerk', 'Schreiner / Zimmerer'],
    joiner: ['handwerk', 'Schreiner'],
    cabinet_maker: ['handwerk', 'Schreiner'],
    painter: ['handwerk', 'Maler und Lackierer'],
    roofer: ['handwerk', 'Dachdecker'],
    tiler: ['handwerk', 'Fliesenleger'],
    floorer: ['handwerk', 'Bodenleger'],
    plasterer: ['handwerk', 'Stuckateur'],
    glaziery: ['handwerk', 'Glaser'],
    metal_construction: ['handwerk', 'Metallbau'],
    locksmith: ['handwerk', 'Schlüsseldienst / Metallbau'],
    stonemason: ['handwerk', 'Steinmetz'],
    builder: ['handwerk', 'Bauunternehmen'],
    window_construction: ['handwerk', 'Fensterbau'],
    insulation: ['handwerk', 'Dämmung'],
    scaffolder: ['handwerk', 'Gerüstbau'],
    gardener: ['handwerk', 'Garten- und Landschaftsbau'],
    upholsterer: ['handwerk', 'Raumausstatter'],
    blacksmith: ['handwerk', 'Schmied'],
    tailor: ['handwerk', 'Schneiderei'],
    shoemaker: ['handwerk', 'Schuhmacher'],
    optician: ['gesundheit', 'Optiker'],
    orthopedic_technician: ['gesundheit', 'Orthopädietechnik'],
    dental_technician: ['gesundheit', 'Zahntechnik'],
    hairdresser: ['beauty', 'Friseur'],
    photographer: ['dienstleistung', 'Fotograf'],
    printer: ['dienstleistung', 'Druckerei'],
    caterer: ['gastronomie', 'Catering'],
    confectionery: ['handwerk', 'Konditorei'],
    brewery: ['gastronomie', 'Brauerei'],
    car_repair: ['kfz', 'Kfz-Werkstatt'],
  },
  shop: {
    car_repair: ['kfz', 'Kfz-Werkstatt'],
    car: ['kfz', 'Autohaus'],
    tyres: ['kfz', 'Reifenservice'],
    car_parts: ['kfz', 'Kfz-Teile'],
    motorcycle: ['kfz', 'Motorradhandel / -werkstatt'],
    bicycle: ['einzelhandel', 'Fahrradladen'],
    hairdresser: ['beauty', 'Friseur'],
    beauty: ['beauty', 'Kosmetikstudio'],
    cosmetics: ['beauty', 'Kosmetik'],
    massage: ['beauty', 'Massage'],
    tattoo: ['beauty', 'Tattoostudio'],
    optician: ['gesundheit', 'Optiker'],
    hearing_aids: ['gesundheit', 'Hörakustik'],
    medical_supply: ['gesundheit', 'Sanitätshaus'],
    bakery: ['handwerk', 'Bäckerei'],
    butcher: ['handwerk', 'Metzgerei'],
    pastry: ['handwerk', 'Konditorei'],
    trade: ['handwerk', 'Baustoffhandel'],
    doityourself: ['einzelhandel', 'Baumarkt'],
    electrical: ['handwerk', 'Elektrofachgeschäft'],
    kitchen: ['handwerk', 'Küchenstudio'],
    interior_decoration: ['handwerk', 'Raumausstattung'],
    flooring: ['handwerk', 'Bodenbeläge'],
    windows: ['handwerk', 'Fensterbau'],
    funeral_directors: ['dienstleistung', 'Bestatter'],
    dry_cleaning: ['dienstleistung', 'Reinigung'],
    laundry: ['dienstleistung', 'Wäscherei'],
    travel_agency: ['dienstleistung', 'Reisebüro'],
    copyshop: ['dienstleistung', 'Copyshop'],
    estate_agent: ['dienstleistung', 'Immobilienmakler'],
  },
  amenity: {
    doctors: ['gesundheit', 'Arztpraxis'],
    dentist: ['gesundheit', 'Zahnarztpraxis'],
    clinic: ['gesundheit', 'Klinik / MVZ'],
    pharmacy: ['gesundheit', 'Apotheke'],
    veterinary: ['gesundheit', 'Tierarztpraxis'],
    restaurant: ['gastronomie', 'Restaurant'],
    cafe: ['gastronomie', 'Café'],
    bar: ['gastronomie', 'Bar'],
    pub: ['gastronomie', 'Kneipe'],
    biergarten: ['gastronomie', 'Biergarten'],
    fast_food: ['gastronomie', 'Imbiss'],
    ice_cream: ['gastronomie', 'Eiscafé'],
    car_wash: ['kfz', 'Autowäsche'],
    car_rental: ['kfz', 'Autovermietung'],
    driving_school: ['freizeit_bildung', 'Fahrschule'],
    music_school: ['freizeit_bildung', 'Musikschule'],
    language_school: ['freizeit_bildung', 'Sprachschule'],
    dancing_school: ['freizeit_bildung', 'Tanzschule'],
    childcare: ['freizeit_bildung', 'Kinderbetreuung'],
  },
  healthcare: {
    physiotherapist: ['gesundheit', 'Physiotherapie'],
    occupational_therapist: ['gesundheit', 'Ergotherapie'],
    speech_therapist: ['gesundheit', 'Logopädie'],
    alternative: ['gesundheit', 'Heilpraktiker'],
    psychotherapist: ['gesundheit', 'Psychotherapie'],
    podiatrist: ['gesundheit', 'Podologie'],
    nursing: ['gesundheit', 'Pflegedienst'],
    doctor: ['gesundheit', 'Arztpraxis'],
    dentist: ['gesundheit', 'Zahnarztpraxis'],
    pharmacy: ['gesundheit', 'Apotheke'],
  },
  office: {
    lawyer: ['dienstleistung', 'Rechtsanwalt'],
    notary: ['dienstleistung', 'Notar'],
    tax_advisor: ['dienstleistung', 'Steuerberater'],
    accountant: ['dienstleistung', 'Buchhaltung'],
    insurance: ['dienstleistung', 'Versicherungsagentur'],
    estate_agent: ['dienstleistung', 'Immobilienmakler'],
    property_management: ['dienstleistung', 'Hausverwaltung'],
    architect: ['dienstleistung', 'Architekturbüro'],
    engineer: ['dienstleistung', 'Ingenieurbüro'],
    surveyor: ['dienstleistung', 'Vermessungsbüro'],
    it: ['dienstleistung', 'IT-Dienstleister'],
    consulting: ['dienstleistung', 'Beratung'],
    financial: ['dienstleistung', 'Finanzberatung'],
    financial_advisor: ['dienstleistung', 'Finanzberatung'],
    advertising_agency: ['dienstleistung', 'Werbeagentur'],
    travel_agent: ['dienstleistung', 'Reisebüro'],
    employment_agency: ['dienstleistung', 'Personalvermittlung'],
    therapist: ['gesundheit', 'Therapiepraxis'],
    physician: ['gesundheit', 'Arztpraxis'],
  },
  leisure: {
    fitness_centre: ['freizeit_bildung', 'Fitnessstudio'],
    sports_centre: ['freizeit_bildung', 'Sportzentrum'],
    dance: ['freizeit_bildung', 'Tanzschule'],
  },
  tourism: {
    hotel: ['gastronomie', 'Hotel'],
    guest_house: ['gastronomie', 'Pension'],
    hostel: ['gastronomie', 'Hostel'],
    apartment: ['gastronomie', 'Ferienwohnung'],
  },
};

// Einzelhandel: deutsche Bezeichnungen für häufige shop-Werte
const LADEN: Record<string, string> = {
  florist: 'Blumenladen', clothes: 'Bekleidung', shoes: 'Schuhgeschäft', books: 'Buchhandlung', jewelry: 'Schmuck',
  furniture: 'Möbel', kiosk: 'Kiosk', supermarket: 'Supermarkt', convenience: 'Lebensmittel', beverages: 'Getränkehandel',
  wine: 'Weinhandlung', gift: 'Geschenkartikel', toys: 'Spielwaren', pet: 'Tierbedarf', mobile_phone: 'Handyladen',
  computer: 'Computerladen', electronics: 'Elektronik', sports: 'Sportgeschäft', stationery: 'Schreibwaren',
  hardware: 'Eisenwaren', garden_centre: 'Gartencenter', photo: 'Fotogeschäft', art: 'Kunsthandel', music: 'Musikgeschäft',
  musical_instrument: 'Musikinstrumente', chemist: 'Drogerie', deli: 'Feinkost', greengrocer: 'Obst und Gemüse',
  tobacco: 'Tabakwaren', second_hand: 'Second-Hand', variety_store: 'Kaufhaus', bag: 'Taschen', fabric: 'Stoffe',
  tea: 'Teeladen', coffee: 'Kaffeehandel', confectionery: 'Süßwaren', antiques: 'Antiquitäten', bed: 'Betten',
  lighting: 'Leuchten', paint: 'Farbenhandel', houseware: 'Haushaltswaren', outdoor: 'Outdoor', e_cigarette: 'E-Zigaretten',
};

// Keine Akquise-Ziele: öffentliche Einrichtungen, Infrastruktur, Vereine
const AUSSCHLUSS_OSM: Record<string, string[]> = {
  amenity: [
    'school', 'kindergarten', 'university', 'college', 'place_of_worship', 'parking', 'parking_space',
    'bicycle_parking', 'bench', 'toilets', 'post_box', 'post_office', 'recycling', 'waste_basket', 'atm', 'bank',
    'townhall', 'police', 'fire_station', 'library', 'community_centre', 'social_facility', 'public_bookcase',
    'charging_station', 'vending_machine', 'telephone', 'shelter', 'grave_yard', 'hospital', 'fuel',
    'drinking_water', 'fountain', 'bus_station', 'taxi', 'courthouse', 'prison', 'arts_centre', 'theatre', 'cinema',
    'nightclub', 'stripclub', 'casino', 'gambling', 'social_centre',
  ],
  office: ['government', 'association', 'ngo', 'political_party', 'religion', 'diplomatic', 'educational_institution'],
  shop: ['vacant'],
  leisure: ['park', 'playground', 'pitch', 'garden', 'sports_hall', 'stadium', 'swimming_pool', 'track', 'nature_reserve'],
};

// Google Places (New): primäre Typen
const GOOGLE: Record<string, Regel> = {
  electrician: ['handwerk', 'Elektroinstallateur'],
  plumber: ['handwerk', 'Sanitär, Heizung, Klima'],
  roofing_contractor: ['handwerk', 'Dachdecker'],
  painter: ['handwerk', 'Maler und Lackierer'],
  general_contractor: ['handwerk', 'Bauunternehmen'],
  locksmith: ['handwerk', 'Schlüsseldienst'],
  bakery: ['handwerk', 'Bäckerei'],
  car_repair: ['kfz', 'Kfz-Werkstatt'],
  car_dealer: ['kfz', 'Autohaus'],
  car_wash: ['kfz', 'Autowäsche'],
  car_rental: ['kfz', 'Autovermietung'],
  hair_salon: ['beauty', 'Friseur'],
  hair_care: ['beauty', 'Friseur'],
  barber_shop: ['beauty', 'Barbier'],
  beauty_salon: ['beauty', 'Kosmetikstudio'],
  nail_salon: ['beauty', 'Nagelstudio'],
  spa: ['beauty', 'Spa'],
  massage: ['beauty', 'Massage'],
  doctor: ['gesundheit', 'Arztpraxis'],
  dentist: ['gesundheit', 'Zahnarztpraxis'],
  dental_clinic: ['gesundheit', 'Zahnarztpraxis'],
  physiotherapist: ['gesundheit', 'Physiotherapie'],
  pharmacy: ['gesundheit', 'Apotheke'],
  veterinary_care: ['gesundheit', 'Tierarztpraxis'],
  lawyer: ['dienstleistung', 'Rechtsanwalt'],
  accounting: ['dienstleistung', 'Steuerberatung / Buchhaltung'],
  insurance_agency: ['dienstleistung', 'Versicherungsagentur'],
  real_estate_agency: ['dienstleistung', 'Immobilienmakler'],
  travel_agency: ['dienstleistung', 'Reisebüro'],
  moving_company: ['dienstleistung', 'Umzugsunternehmen'],
  restaurant: ['gastronomie', 'Restaurant'],
  cafe: ['gastronomie', 'Café'],
  bar: ['gastronomie', 'Bar'],
  hotel: ['gastronomie', 'Hotel'],
  lodging: ['gastronomie', 'Unterkunft'],
  gym: ['freizeit_bildung', 'Fitnessstudio'],
  fitness_center: ['freizeit_bildung', 'Fitnessstudio'],
  driving_school: ['freizeit_bildung', 'Fahrschule'],
};

// Firmenname: nur Hinweis, daher "nicht sicher"
const NAME: [RegExp, Regel][] = [
  [/elektro|elektrik/i, ['handwerk', 'Elektroinstallateur']],
  [/sanitär|heizung|shk|klima|bad\s?&|bäder/i, ['handwerk', 'Sanitär, Heizung, Klima']],
  [/schreiner|tischler|zimmerei|holzbau/i, ['handwerk', 'Schreiner / Zimmerer']],
  [/maler|lackier|stuck/i, ['handwerk', 'Maler und Lackierer']],
  [/dach|spengler|flaschner/i, ['handwerk', 'Dachdecker / Flaschner']],
  [/fliesen|naturstein|parkett|boden/i, ['handwerk', 'Fliesen / Boden']],
  [/metallbau|schlosserei|glaserei|fensterbau|rollladen/i, ['handwerk', 'Metall- / Fensterbau']],
  [/bau(unternehmen|geschäft|firma)?\b|bautechnik|sanierung|renovierung/i, ['handwerk', 'Bau und Sanierung']],
  [/garten|landschaftsbau/i, ['handwerk', 'Garten- und Landschaftsbau']],
  [/kfz|autohaus|auto[\s-]?service|autowerkstatt|reifen|karosserie|werkstatt/i, ['kfz', 'Kfz-Werkstatt']],
  [/friseur|frisör|hair|barber|coiffeur/i, ['beauty', 'Friseur']],
  [/kosmetik|beauty|nail|nagel|lash|wimpern|massage|tattoo/i, ['beauty', 'Kosmetik / Beauty']],
  [/physio|ergo|logopäd|osteopath|heilprakt/i, ['gesundheit', 'Therapiepraxis']],
  [/zahn|dental|arzt|ärzt|praxis|dr\.\s?med|apotheke|pflege/i, ['gesundheit', 'Praxis']],
  [/steuer|kanzlei|rechtsanw|anwalt|notar|versicherung|immobilien|hausverwaltung|architekt|ingenieur/i, ['dienstleistung', 'Büro / Kanzlei']],
  [/restaurant|ristorante|pizzeria|trattoria|café|cafe|bistro|imbiss|döner|bar\b|weinstube|gasthaus|gaststätte|hotel/i, ['gastronomie', 'Gastronomie']],
  [/fitness|yoga|pilates|tanzschule|fahrschule|musikschule|nachhilfe/i, ['freizeit_bildung', 'Sport / Bildung']],
];

// Ketten und Filialisten: haben eigene Zentrale, keine Kunden für uns
const KETTEN = [
  'aldi', 'lidl', 'rewe', 'edeka', 'penny', 'netto', 'kaufland', 'norma', 'dm-drogerie', 'dm drogerie', 'rossmann',
  'müller drogerie', "mcdonald", 'burger king', 'subway', 'starbucks', 'kfc', 'domino', 'five guys', 'nordsee',
  'vapiano', 'hans im glück', 'backwerk', 'kamps', 'ditsch', 'sparkasse', 'volksbank', 'deutsche bank', 'commerzbank',
  'postbank', 'targobank', 'santander', 'a.t.u', 'atu ', 'pitstop', 'euromaster', 'vergölst', 'bosch car service',
  'shell', 'aral', 'esso', 'jet ', 'vodafone', 'telekom', 'o2 ', 'fielmann', 'apollo', 'douglas', 'tchibo',
  'deutsche post', 'dhl', 'hermes', 'mister minit', 'klier', 'essanelle', 'kieser', 'mcfit', 'clever fit', 'fitx',
];

export function istKette(name: string, tags: Record<string, string> = {}): boolean {
  if (tags['brand'] || tags['brand:wikidata'] || tags['operator:wikidata']) return true;
  const n = ` ${name.toLowerCase()} `;
  return KETTEN.some((k) => n.includes(k));
}

function zuordnung([bereich, kategorie]: Regel, sicher: boolean): Zuordnung {
  return { bereich, kategorie, passung: BEREICHE[bereich].passung, sicher };
}

export function nachName(name: string): Zuordnung | null {
  for (const [muster, regel] of NAME) if (muster.test(name)) return zuordnung(regel, false);
  return null;
}

export function kategorisiereOsm(name: string, tags: Record<string, string>): Zuordnung {
  for (const [schluessel, werte] of Object.entries(AUSSCHLUSS_OSM)) {
    const wert = tags[schluessel];
    if (wert && werte.includes(wert)) {
      return { ...zuordnung(['sonstige', `${schluessel}=${wert}`], true), ausschluss: 'öffentlich oder kein Betrieb' };
    }
  }
  // Allgemeine Angaben wie office=company sagen nichts über die Branche: Name hat Vorrang
  const allgemein = ['company', 'yes'];
  if (['office', 'shop', 'craft'].some((k) => tags[k] && allgemein.includes(tags[k]!))) {
    const ausName = nachName(name);
    if (ausName) return ausName;
  }
  // Reihenfolge: spezifische Schlüssel zuerst
  for (const schluessel of ['craft', 'healthcare', 'shop', 'office', 'amenity', 'leisure', 'tourism']) {
    const wert = tags[schluessel];
    if (!wert) continue;
    const regel = OSM[schluessel]?.[wert];
    if (regel) return zuordnung(regel, true);
  }
  const ausName = nachName(name);
  if (ausName) return ausName;
  if (tags['shop']) return zuordnung(['einzelhandel', LADEN[tags['shop']] ?? 'Geschäft'], true);
  if (tags['craft']) return zuordnung(['handwerk', 'Handwerksbetrieb'], true);
  if (tags['office']) return zuordnung(['dienstleistung', 'Büro / Unternehmen'], false);
  return zuordnung(['sonstige', 'Unbekannt'], false);
}

export function kategorisiereGoogle(name: string, typen: string[]): Zuordnung {
  for (const typ of typen) {
    const regel = GOOGLE[typ];
    if (regel) return zuordnung(regel, true);
  }
  const ausName = nachName(name);
  if (ausName) return ausName;
  if (typen.some((t) => t.endsWith('_store') || t === 'store')) return zuordnung(['einzelhandel', 'Geschäft'], true);
  return zuordnung(['sonstige', 'Unbekannt'], false);
}

/** Zuordnung zur Branche im CRM-Datenmodell (kfz, handwerk, physio, sonstige). */
export function brancheFuerCrm(z: Pick<Zuordnung, 'bereich' | 'kategorie'>): 'kfz' | 'handwerk' | 'physio' | 'sonstige' {
  if (z.bereich === 'kfz') return 'kfz';
  if (z.bereich === 'handwerk') return 'handwerk';
  if (z.bereich === 'gesundheit' && /physio/i.test(z.kategorie)) return 'physio';
  return 'sonstige';
}

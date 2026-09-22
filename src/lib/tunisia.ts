/**
 * Tunisian places, for the pickers that would otherwise be free-text boxes.
 *
 * The distinction that matters:
 *
 *   Governorates are a CLOSED list. There are exactly 24, they do not change,
 *   and letting people type them means "Ben Arous", "ben arous" and "Ben-Arous"
 *   all end up in the same column — which quietly breaks every filter and
 *   grouping built on it later.
 *
 *   Cities are an OPEN list. What follows is the main delegations of each
 *   governorate, not every locality in the country: a village or a named
 *   neighbourhood will be missing. So the city picker suggests from this and
 *   still accepts anything typed, rather than refusing an address because it
 *   is small.
 */

export const GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

export const CITIES_BY_GOVERNORATE: Record<string, string[]> = {
  Ariana: ["Ariana", "Ettadhamen", "Kalâat el-Andalous", "La Soukra", "Mnihla", "Raoued", "Sidi Thabet"],
  "Béja": ["Béja", "Amdoun", "Goubellat", "Medjez el-Bab", "Nefza", "Téboursouk", "Testour", "Thibar"],
  "Ben Arous": ["Ben Arous", "Bou Mhel el-Bassatine", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam Lif", "Mégrine", "Mohamedia", "Mornag", "Radès"],
  Bizerte: ["Bizerte", "El Alia", "Ghar el-Melh", "Mateur", "Menzel Bourguiba", "Menzel Jemil", "Ras Jebel", "Sejnane", "Tinja", "Utique", "Zarzouna"],
  "Gabès": ["Gabès", "El Hamma", "Ghannouch", "Mareth", "Matmata", "Métouia", "Menzel Habib", "Nouvelle Matmata"],
  Gafsa: ["Gafsa", "El Guettar", "El Ksar", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened", "Sidi Aïch"],
  Jendouba: ["Jendouba", "Aïn Draham", "Balta-Bou Aouane", "Bou Salem", "Fernana", "Ghardimaou", "Oued Meliz", "Tabarka"],
  Kairouan: ["Kairouan", "Bou Hajla", "Chebika", "Echrarda", "Haffouz", "Hajeb El Ayoun", "Nasrallah", "Oueslatia", "Sbikha"],
  Kasserine: ["Kasserine", "Ezzouhour", "Fériana", "Foussana", "Haïdra", "Hassi El Ferid", "Jedelienne", "Majel Bel Abbès", "Sbeïtla", "Sbiba", "Thala"],
  "Kébili": ["Kébili", "Douz", "Faouar", "Souk Lahad"],
  "Le Kef": ["Le Kef", "Dahmani", "Jérissa", "Kalaat Khasba", "Kalâat Senan", "Nebeur", "Sakiet Sidi Youssef", "Tajerouine"],
  Mahdia: ["Mahdia", "Bou Merdès", "Chebba", "Chorbane", "El Jem", "Hebira", "Ksour Essef", "Melloulèche", "Ouled Chamekh", "Sidi Alouane", "Souassi"],
  Manouba: ["Manouba", "Borj El Amri", "Douar Hicher", "El Battan", "Jedaida", "Mornaguia", "Oued Ellil", "Tebourba"],
  "Médenine": ["Médenine", "Ben Gardane", "Beni Khedache", "Djerba Ajim", "Djerba Houmt Souk", "Djerba Midoun", "Sidi Makhlouf", "Zarzis"],
  Monastir: ["Monastir", "Bekalta", "Bembla", "Beni Hassen", "Jemmal", "Ksar Hellal", "Ksibet el-Médiouni", "Moknine", "Ouerdanine", "Sahline", "Sayada", "Téboulba", "Zéramdine"],
  Nabeul: ["Nabeul", "Béni Khalled", "Béni Khiar", "Bou Argoub", "Dar Chaabane", "El Haouaria", "El Mida", "Grombalia", "Hammamet", "Kélibia", "Korba", "Menzel Bouzelfa", "Menzel Temime", "Soliman", "Takelsa"],
  Sfax: ["Sfax", "Agareb", "Bir Ali Ben Khélifa", "El Amra", "El Hencha", "Ghraïba", "Jebiniana", "Kerkennah", "Mahrès", "Menzel Chaker", "Sakiet Eddaïer", "Sakiet Ezzit", "Skhira", "Thyna"],
  "Sidi Bouzid": ["Sidi Bouzid", "Bir El Hafey", "Cebbala Ouled Asker", "Jilma", "Meknassy", "Menzel Bouzaiane", "Mezzouna", "Ouled Haffouz", "Regueb", "Souk Jedid"],
  Siliana: ["Siliana", "Bargou", "Bou Arada", "El Aroussa", "Gaâfour", "Kesra", "Makthar", "Rouhia", "Sidi Bou Rouis"],
  Sousse: ["Sousse", "Akouda", "Bouficha", "Enfidha", "Hammam Sousse", "Hergla", "Kalâa Kebira", "Kalâa Seghira", "Kondar", "M'saken", "Sidi Bou Ali", "Sidi El Hani"],
  Tataouine: ["Tataouine", "Bir Lahmar", "Dehiba", "Ghomrassen", "Remada", "Smâr"],
  Tozeur: ["Tozeur", "Degache", "Hazoua", "Nefta", "Tameghza"],
  Tunis: ["Tunis", "Bab El Bhar", "Bab Souika", "Carthage", "Cité El Khadra", "Djebel Jelloud", "El Kabaria", "El Menzah", "El Omrane", "El Ouardia", "Ettahrir", "Ezzouhour", "Hraïria", "La Goulette", "La Marsa", "Le Bardo", "Le Kram", "Sidi Bou Saïd", "Sidi El Béchir", "Sidi Hassine"],
  Zaghouan: ["Zaghouan", "Bir Mcherga", "El Fahs", "Nadhour", "Saouaf", "Zriba"],
};

/** Every listed city, de-duplicated — for pickers with no governorate context. */
export const ALL_CITIES: string[] = [
  ...new Set(Object.values(CITIES_BY_GOVERNORATE).flat()),
].sort((a, b) => a.localeCompare(b, "fr"));

/**
 * Cities to suggest, narrowed by governorate when one is known.
 *
 * An unknown governorate falls back to the whole country rather than to an
 * empty list: a half-filled form should still help.
 */
export function citiesFor(governorate?: string): string[] {
  if (!governorate) return ALL_CITIES;
  const list = CITIES_BY_GOVERNORATE[governorate];
  return list && list.length > 0 ? list : ALL_CITIES;
}

/**
 * Every city as a picker option, captioned with its governorate.
 *
 * A handful of names repeat across the country — Ezzouhour is both a Tunis
 * neighbourhood and a Kasserine delegation — so the caption lists every
 * governorate the name appears in rather than silently picking the first.
 * Without it the picker confidently mislabels one of them.
 */
export const ALL_CITY_OPTIONS: { value: string; label: string; hint: string }[] =
  ALL_CITIES.map((city) => {
    const govs = Object.entries(CITIES_BY_GOVERNORATE)
      .filter(([, cities]) => cities.includes(city))
      .map(([gov]) => gov);
    // A governorate capital shares its governorate's name, and captioning
    // "Sousse" with "Sousse" tells nobody anything.
    const hint = govs.length === 1 && govs[0] === city ? "" : govs.join(" · ");
    return { value: city, label: city, hint };
  });

/**
 * The governorate a listed city belongs to — only when it is unambiguous.
 *
 * Callers use this to auto-fill a blank governorate from a chosen city, so a
 * name that exists in two governorates returns nothing rather than a coin
 * flip: an empty field asks the question, a wrong one never does.
 */
export function governorateOf(city: string): string | undefined {
  const needle = city.trim().toLowerCase();
  if (!needle) return undefined;
  const hits = Object.entries(CITIES_BY_GOVERNORATE)
    .filter(([, cities]) => cities.some((c) => c.toLowerCase() === needle))
    .map(([gov]) => gov);
  return hits.length === 1 ? hits[0] : undefined;
}

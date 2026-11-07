// Static knowledge base: shooting slots, regions, subjects, conditions and styles.
// Preset matching is data-driven: subjects point at the same location tokens
// that appear in each preset's "locations" array.

export const SLOTS = [
  {
    id: 'night',
    label: 'Night',
    color: '#1b2140',
    ink: '#d8dcf2',
    rule: 'Sun more than 8° below the horizon',
    tip: 'Artificial light only. Shoot RAW, keep lamps from clipping (about −0.7 EV is typical), ISO 400–1600, and brace the camera on a ledge or strap. Expect noise, so raise luminance noise reduction.',
  },
  {
    id: 'blue-hour',
    label: 'Blue hour',
    color: '#3f66a8',
    ink: '#eef3ff',
    rule: 'Sun 4–8° below the horizon',
    tip: 'The sky is still deep blue while floodlights switch on, which is the most balanced exposure between sky and artificial light. Use ISO 200–800 and brace the camera.',
  },
  {
    id: 'golden-am',
    label: 'Golden hour (AM)',
    color: '#e0a35a',
    ink: '#2a1a05',
    rule: 'Sun from 4° below to 6° above, rising',
    tip: 'Low warm side-light grazes facades and rock, giving the best texture of the day, and courtyards are quieter. Meter for the highlights; −0.3 EV is a safe start.',
  },
  {
    id: 'morning',
    label: 'Morning',
    color: '#efd58c',
    ink: '#2b2308',
    rule: 'Sun 6–45° high, before noon',
    tip: 'Clean directional light before it turns harsh. Shoot RAW at base ISO and hold about −0.3 EV so white marble keeps its detail.',
  },
  {
    id: 'midday',
    label: 'Midday',
    color: '#dfeaf1',
    ink: '#10222c',
    rule: 'Sun higher than 45°',
    tip: 'Overhead sun is the hardest light. Dial in −0.3 to −0.7 EV in camera to protect white marble and ihram highlights, and favour shade, arcades and interiors.',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    color: '#e9c47c',
    ink: '#2b1d05',
    rule: 'Sun 6–45° high, after noon',
    tip: 'Light warms and softens again. Good for gold details and long courtyard shadows; keep about −0.3 EV while marble is still bright.',
  },
  {
    id: 'golden-pm',
    label: 'Golden hour (PM)',
    color: '#e58b45',
    ink: '#2a1203',
    rule: 'Sun 2–6° above the horizon, setting',
    tip: 'Warm low light is the prime window for domes, minarets and ridgelines. Lit and shaded sides diverge fast, so protect highlights.',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    color: '#c4543e',
    ink: '#fff1ea',
    rule: 'Sun from 2° above to 4° below, setting',
    tip: 'Colour changes minute by minute, so shoot a quick bracket. Expose for the sky and lift shadows in the edit.',
  },
];

export const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

// Order used for table columns (morning to night).
export const SLOT_COLUMNS = ['golden-am', 'morning', 'midday', 'afternoon', 'golden-pm', 'sunset', 'blue-hour', 'night'];

// How well each timeOfDay tag fits each slot (0–1). Keys are lower-case tags.
export const TIME_AFFINITY = {
  morning: { morning: 1, 'golden-am': 0.85, midday: 0.35, afternoon: 0.4 },
  midday: { midday: 1, morning: 0.45, afternoon: 0.45 },
  afternoon: { afternoon: 1, midday: 0.45, 'golden-pm': 0.75, morning: 0.35 },
  'golden hour (am)': { 'golden-am': 1, morning: 0.6 },
  sunrise: { 'golden-am': 1, 'blue-hour': 0.4, morning: 0.5 },
  'golden hour (pm)': { 'golden-pm': 1, sunset: 0.8, afternoon: 0.6 },
  sunset: { sunset: 1, 'golden-pm': 0.85, 'blue-hour': 0.4 },
  'blue hour': { 'blue-hour': 1, sunset: 0.6, night: 0.5, 'golden-am': 0.3 },
  night: { night: 1, 'blue-hour': 0.6, sunset: 0.3 },
  'any time': Object.fromEntries(
    ['night', 'blue-hour', 'golden-am', 'morning', 'midday', 'afternoon', 'golden-pm', 'sunset'].map((s) => [s, 0.7]),
  ),
};

export const TIME_TAGS = [
  'Morning',
  'Midday',
  'Afternoon',
  'Golden hour (AM)',
  'Golden hour (PM)',
  'Sunrise',
  'Sunset',
  'Blue hour',
  'Night',
  'Any time',
];

export const SKIES = [
  { id: 'clear', label: 'Clear & bright', hint: 'Hard sun, deep blue sky' },
  { id: 'hazy', label: 'Dusty / hazy', hint: 'Dust, humidity or pale sky' },
  { id: 'overcast', label: 'Overcast', hint: 'Flat, cloudy light' },
];

export const STYLES = [
  { id: 'auto', label: 'Let the light decide' },
  { id: 'punchy', label: 'Punchy & rich' },
  { id: 'soft', label: 'Soft & matte' },
  { id: 'film', label: 'Film look' },
  { id: 'mono', label: 'Black & white' },
];

export const REGIONS = [
  {
    id: 'mecca',
    name: 'Mecca',
    arabic: 'مكة المكرمة',
    token: 'Mecca',
    lat: 21.4225,
    lon: 39.8262,
    tagline: 'White marble, hard light, dense crowds',
    character: [
      'Marble courtyards bounce hard light upward, so protect the highlights first and lift shadows second.',
      'Crowds are dense around the clock. Wider, patient compositions beat tight crops of strangers.',
      'Night lighting around the Haram mixes white, warm and green sources, a good case for a balanced night grade.',
    ],
  },
  {
    id: 'madinah',
    name: 'Madinah',
    arabic: 'المدينة المنورة',
    token: 'Medina',
    lat: 24.4672,
    lon: 39.6111,
    tagline: 'Green dome, umbrellas, dark volcanic earth',
    character: [
      'The courtyards of Masjid an-Nabawi, with their pale umbrella canopies, reward warm and soft film looks.',
      'Dark volcanic basalt around Uhud gives deep reds and browns. Keep the sky muted so the earth carries the frame.',
      'Air is usually drier and clearer than on the coast; dust is the main source of haze.',
    ],
  },
  {
    id: 'jeddah',
    name: 'Jeddah',
    arabic: 'جدة',
    token: 'Jeddah',
    lat: 21.4858,
    lon: 39.1925,
    tagline: 'Red Sea haze, coral-stone old town, white waterfront',
    character: [
      'Red Sea humidity adds a coastal haze to distance shots; soft, matte looks tend to embrace it.',
      "Al-Balad's coral-stone houses with carved wooden roshan balconies are a documentary subject.",
      'Waterfront architecture is white and reflective, so treat it like Haramain marble.',
    ],
    note: "Your preset pack is tagged for Mecca, Medina & Desert, so Jeddah picks are matched by subject (historic streets, architecture, night skylines). Add “Jeddah” to a preset's locations in the editor to prefer it here.",
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// primary / secondary = location tokens found in preset.locations
// keywords = lower-case words searched in a preset's description, notes and HSL notes
export const SUBJECTS = [
  // Mecca
  {
    id: 'mecca-haram',
    region: 'mecca',
    label: 'Masjid al-Haram courtyards & facades',
    primary: ['Haramain courtyards', 'Haramain'],
    secondary: ['Architecture', 'Mecca'],
    keywords: ['marble'],
    tip: 'Bright marble reflects light upward, so faces and fabric stay open in shade. Meter the marble, not the people.',
  },
  {
    id: 'mecca-tawaf',
    region: 'mecca',
    label: 'Tawaf, Kaaba & light rays',
    primary: ['Tawaf'],
    secondary: ['Interiors', 'Haramain courtyards', 'Mecca'],
    keywords: ['kiswah', 'tawaf', 'light rays'],
    tip: 'Photograph the flow, not individuals: wide frames or a slow shutter. Avoid flash and keep clear of worshippers.',
  },
  {
    id: 'mecca-night',
    region: 'mecca',
    label: 'Haram, clock tower & skyline at night',
    primary: ['Night architecture'],
    secondary: ['Architecture', 'Mecca'],
    keywords: ['floodlight', 'emerald', 'dome'],
    tip: 'Floodlights clip easily: expose for the lamps, then lift shadows. A deep navy sky reads as cleaner than a grey one.',
  },
  {
    id: 'mecca-hills',
    region: 'mecca',
    label: 'Mecca hills & desert roads',
    primary: ['Desert'],
    secondary: ['Historical sites', 'Mecca'],
    keywords: ['haze', 'dust', 'sand'],
    tip: 'Dust flattens distance. Either cut through it with Dehaze or lean into it for a soft, atmospheric frame.',
  },
  {
    id: 'mecca-street',
    region: 'mecca',
    label: 'Streets, markets & pilgrims on the move',
    primary: ['Street'],
    secondary: ['Historical sites', 'Mecca'],
    keywords: ['documentary', 'dusty'],
    tip: 'Shoot at street level with a longer focal length, and ask before photographing people up close.',
  },
  // Madinah
  {
    id: 'madinah-nabawi',
    region: 'madinah',
    label: 'Masjid an-Nabawi courtyards, umbrellas & Green Dome',
    primary: ['Haramain courtyards', 'Haramain'],
    secondary: ['Architecture', 'Medina'],
    keywords: ['umbrella', 'marble', 'gold'],
    tip: 'Umbrella canopies give you repeating shapes and soft shade. Late-afternoon light warms the marble beautifully.',
  },
  {
    id: 'madinah-night',
    region: 'madinah',
    label: 'Masjid an-Nabawi at night: green domes & minarets',
    primary: ['Night architecture'],
    secondary: ['Architecture', 'Medina'],
    keywords: ['emerald', 'dome', 'minaret', 'sage'],
    tip: 'Neon-ish green lights can overpower the frame. Tame green saturation and keep the sky deep.',
  },
  {
    id: 'madinah-uhud',
    region: 'madinah',
    label: 'Mount Uhud & volcanic rock',
    primary: ['Mount Uhud'],
    secondary: ['Desert', 'Historical sites'],
    keywords: ['volcanic', 'terracotta', 'rock'],
    tip: 'Side-light brings out the texture of the dark rock. Keep the sky muted so the red earth is the star.',
  },
  {
    id: 'madinah-historic',
    region: 'madinah',
    label: 'Quba, Qiblatayn & historic sites',
    primary: ['Historical sites'],
    secondary: ['Street', 'Architecture', 'Medina'],
    keywords: ['documentary', 'vintage', 'dusty'],
    tip: 'Quiet early hours give you clean frames. A documentary tone suits weathered stone.',
  },
  {
    id: 'madinah-harrat',
    region: 'madinah',
    label: 'Lava fields & desert roads',
    primary: ['Desert'],
    secondary: ['Mount Uhud', 'Medina'],
    keywords: ['haze', 'dust', 'sand', 'dune'],
    tip: 'Use roads and fences as leading lines. Low sun separates layers of rock and haze.',
  },
  {
    id: 'madinah-street',
    region: 'madinah',
    label: 'Streets & date markets',
    primary: ['Street'],
    secondary: ['Historical sites', 'Medina'],
    keywords: ['documentary', 'dusty'],
    tip: 'Warm, soft light flatters produce and stone. Ask before photographing vendors close up.',
  },
  // Jeddah
  {
    id: 'jeddah-balad',
    region: 'jeddah',
    label: 'Al-Balad old town: coral stone & roshan balconies',
    primary: ['Historical sites', 'Street'],
    secondary: ['Architecture', 'Jeddah'],
    keywords: ['documentary', 'vintage', 'dusty', 'ochre'],
    tip: 'Narrow lanes give strong contrast between sunlit walls and shade. Expose for the walls and keep the carved wood warm.',
  },
  {
    id: 'jeddah-rahma',
    region: 'jeddah',
    label: 'Corniche & Al-Rahma Mosque',
    primary: ['Architecture'],
    secondary: ['Haramain courtyards', 'Haramain', 'Jeddah'],
    keywords: ['marble', 'cyan'],
    tip: 'White walls over water reflect strongly. Hold about −0.3 EV and watch for sea haze on distant frames.',
  },
  {
    id: 'jeddah-night',
    region: 'jeddah',
    label: 'Waterfront & skyline at night',
    primary: ['Night architecture'],
    secondary: ['Architecture', 'Jeddah'],
    keywords: ['floodlight', 'emerald'],
    tip: 'Water reflections double your light sources. Brace the camera and protect highlights on the brightest lamps.',
  },
  {
    id: 'jeddah-street',
    region: 'jeddah',
    label: 'Streets, souqs & street life',
    primary: ['Street'],
    secondary: ['Historical sites', 'Jeddah'],
    keywords: ['documentary', 'dusty'],
    tip: 'Market awnings create patchy light; expose for the faces or goods you care about.',
  },
  {
    id: 'jeddah-coast',
    region: 'jeddah',
    label: 'Red Sea coast & desert edges',
    primary: ['Desert'],
    secondary: ['Architecture', 'Jeddah'],
    keywords: ['haze', 'pastel'],
    tip: 'Coastal haze softens the horizon. Shoot early or late when the air clears and the light is low.',
  },
];

export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

export const subjectsForRegion = (regionId) => SUBJECTS.filter((s) => s.region === regionId);

export const ETIQUETTE = [
  'Respect worshippers: no close-ups of people praying, no flash, and follow posted signs and staff instructions. Some areas restrict photography.',
  'Drones and tripods are commonly restricted around the holy sites, so check the local rules before packing them.',
];

export const CAMERA_PREP =
  'Shoot DNG/RAW (Lightroom Mobile camera or your phone’s Pro mode) so highlights and white balance stay editable.';

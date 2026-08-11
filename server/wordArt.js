// ═══════════════════════════════════════════════════════════════════════
// wordArt.js — clipart (emoji art) for the live drawing hint
// The system reveals the art progressively during the round, Pictionary-style.
// ═══════════════════════════════════════════════════════════════════════

const WORD_ART = {
  // ── Animals ──
  ant: '🐜', ape: '🦍', bat: '🦇', bear: '🐻', bee: '🐝', bird: '🐦', boar: '🐗',
  calf: '🐮', cat: '🐱', cattle: '🐄', chick: '🐤', clam: '🦪', cod: '🐟', cow: '🐮',
  crab: '🦀', crow: '🐦‍⬛', deer: '🦌', dog: '🐶', dove: '🕊️', duck: '🦆', eagle: '🦅',
  eel: '🐍', emu: '🦃', fawn: '🦌', fish: '🐟', flea: '🪳', fly: '🪰', fox: '🦊',
  frog: '🐸', goat: '🐐', hare: '🐇', hawk: '🦅', hen: '🐔', hog: '🐷', horse: '🐴',
  insect: '🐛', lamb: '🐑', lark: '🐦', lion: '🦁', mare: '🐴', mice: '🐭', mole: '🐹',
  monkey: '🐵', moth: '🦋', mouse: '🐭', mule: '🐴', owl: '🦉', ox: '🐂', pig: '🐷',
  pony: '🐴', pup: '🐶', ram: '🐏', rat: '🐀', robin: '🐦', seal: '🦭', shark: '🦈',
  sheep: '🐑', snake: '🐍', stag: '🦌', swan: '🦢', tiger: '🐯', toad: '🐸', tuna: '🐟',
  wasp: '🐝', wolf: '🐺', worm: '🪱', wren: '🐦', yak: '🦬', animal: '🐾', dragon: '🐉',

  // ── Food & drink ──
  apple: '🍎', banana: '🍌', bread: '🍞', butter: '🧈', cake: '🍰', candy: '🍬',
  cherry: '🍒', coffee: '☕', corn: '🌽', cream: '🥛', egg: '🥚', garlic: '🧄',
  grape: '🍇', ham: '🍖', honey: '🍯', juice: '🧃', lemon: '🍋', lime: '🍋',
  milk: '🥛', mint: '🌿', nut: '🥜', oat: '🌾', olive: '🫒', orange: '🍊',
  pasta: '🍝', pea: '🫛', peanut: '🥜', pear: '🍐', pepper: '🌶️', pie: '🥧',
  pizza: '🍕', plum: '🫐', pork: '🥓', potato: '🥔', rice: '🍚', salad: '🥗',
  salt: '🧂', snack: '🍿', soda: '🥤', spice: '🌶️', steak: '🥩', stew: '🍲',
  sugar: '🍬', syrup: '🍯', tea: '🫖', toast: '🍞', tuna: '🐟', water: '💧',
  wheat: '🌾', wine: '🍷', yam: '🍠',

  // ── Nature ──
  air: '💨', ash: '🪨', autumn: '🍂', bay: '🌊', beach: '🏖️', breeze: '💨',
  bush: '🌳', cave: '🕳️', clay: '🪨', cliff: '🏔️', cloud: '☁️', coast: '🌊',
  coral: '🪸', dawn: '🌅', desert: '🏜️', dew: '💧', dune: '🏜️', dusk: '🌆',
  earth: '🌍', east: '🧭', fern: '🌿', field: '🌾', fire: '🔥', flame: '🔥',
  fog: '🌫️', forest: '🌲', frost: '❄️', gale: '💨', garden: '🌱', glen: '🏞️',
  grass: '🌱', grove: '🌳', harbor: '⚓', haven: '🏝️', hill: '⛰️', horizon: '🌅',
  ice: '🧊', island: '🏝️', isle: '🏝️', jungle: '🌴', lake: '🏞️', land: '🌍',
  leaf: '🍃', light: '💡', mist: '🌫️', moon: '🌙', moor: '🌾', moss: '🪨',
  mud: '🟤', north: '🧭', ocean: '🌊', orbit: '🛰️', ozone: '🌫️', peak: '⛰️',
  pine: '🌲', plain: '🌾', planet: '🪐', pond: '🪷', rain: '🌧️', reef: '🪸',
  ridge: '⛰️', river: '🏞️', rock: '🪨', rocky: '🪨', sand: '🏖️', sandy: '🏖️',
  sea: '🌊', season: '🍂', shadow: '🌑', shore: '🏖️', sky: '🌌', slope: '⛰️',
  snow: '❄️', soil: '🪴', solar: '☀️', south: '🧭', spring: '🌷', star: '⭐',
  stone: '🪨', storm: '⛈️', stream: '🏞️', summer: '☀️', sun: '☀️', sunny: '☀️',
  surf: '🌊', swamp: '🐊', tide: '🌊', timber: '🪵', tree: '🌳', valley: '🏞️',
  volcano: '🌋', warmth: '🔥', wave: '🌊', weather: '⛅', west: '🧭', wind: '💨',
  winter: '❄️', wood: '🪵', world: '🌍',

  // ── Body ──
  arm: '💪', back: '🔙', beard: '🧔', blood: '🩸', bone: '🦴', brain: '🧠',
  breath: '💨', cheek: '😊', chest: '🫁', chin: '😌', ear: '👂', eye: '👁️',
  face: '😀', finger: '☝️', fist: '✊', foot: '🦶', hair: '💇', hand: '✋',
  head: '🙂', heart: '❤️', heel: '🦶', hip: '🍑', jaw: '😬', kidney: '🫘',
  knee: '🦵', leg: '🦵', limb: '🦵', lip: '👄', lung: '🫁', mouth: '👄',
  muscle: '💪', nail: '💅', neck: '🧣', nose: '👃', palm: '✋', rib: '🦴',
  shin: '🦵', skull: '💀', spine: '🦴', thumb: '👍', toe: '🦶', tongue: '👅',
  vein: '🩸', waist: '🧍', wrist: '⌚',

  // ── Home & stuff ──
  bed: '🛏️', bench: '🪑', bin: '🗑️', blanket: '🛌', book: '📖', bottle: '🍾',
  bowl: '🍜', box: '📦', brush: '🖌️', bucket: '🪣', cabinet: '🗄️', candle: '🕯️',
  ceiling: '🏠', chain: '⛓️', chair: '🪑', clock: '⏰', cloth: '🧵', closet: '🚪',
  couch: '🛋️', counter: '🍽️', cup: '☕', cushion: '🛋️', desk: '🪑', door: '🚪',
  drawer: '🗄️', fan: '🌀', floor: '🏠', fridge: '🧊', glass: '🥛', hammer: '🔨',
  handle: '🚪', house: '🏠', hut: '🛖', jar: '🫙', jug: '🫗', key: '🔑',
  kitchen: '🍳', knife: '🔪', ladder: '🪜', lamp: '💡', lid: '🫙', lock: '🔒',
  mat: '🧶', mirror: '🪞', mop: '🧹', mug: '☕', nail: '🔩', oven: '🔥',
  pan: '🍳', peg: '🧷', pen: '🖊️', plate: '🍽️', plug: '🔌', pocket: '👖',
  pot: '🍲', roof: '🏠', room: '🚪', rug: '🪞', shelf: '📚', sheet: '🛏️',
  shower: '🚿', sink: '🚰', sofa: '🛋️', spoon: '🥄', stair: '🪜', stove: '🔥',
  table: '🪑', tape: '📼', tent: '⛺', tile: '⬜', tin: '🥫', towel: '🧻',
  tower: '🏰', tray: '🍽️', tub: '🛁', vase: '🏺', wall: '🧱', window: '🪟',
  wire: '🔌', wok: '🍳', yard: '🌳',

  // ── Colors ──
  black: '⬛', blue: '🟦', brown: '🟫', gold: '🥇', golden: '🥇', gray: '⬜',
  green: '🟩', grey: '⬜', navy: '🔵', orange: '🟧', pink: '🩷', red: '🟥',
  silver: '🥈', tan: '🟤', white: '⬜', yellow: '🟨',

  // ── Travel ──
  bike: '🚲', boat: '⛵', bus: '🚌', car: '🚗', cart: '🛒', ferry: '⛴️',
  flight: '✈️', highway: '🛣️', jet: '✈️', lane: '🛣️', plane: '✈️', road: '🛣️',
  ship: '🚢', street: '🏙️', taxi: '🚕', tire: '🛞', tour: '🗺️', traffic: '🚦',
  train: '🚆', truck: '🚚', tunnel: '🚇', van: '🚐', wheel: '🛞', yacht: '⛵',

  // ── Sports & games ──
  ball: '⚽', bat: '🏏', camp: '⛺', chess: '♟️', club: '🏌️', dart: '🎯',
  dive: '🤿', field: '🏟️', fitness: '🏋️', flag: '🚩', game: '🎮', golf: '⛳',
  gym: '🏋️', hike: '🥾', jog: '🏃', jump: '🤸', kick: '🦵', kite: '🪁',
  league: '🏆', match: '⚔️', net: '🥅', park: '🛝', play: '🎮', polo: '🐎',
  race: '🏁', rally: '🏎️', ring: '🥊', row: '🚣', rugby: '🏉', run: '🏃',
  running: '🏃', score: '🎯', skate: '🛹', ski: '⛷️', spar: '🥊', speed: '⚡',
  spin: '🌀', sport: '🏅', stadium: '🏟️', swim: '🏊', tackle: '🏈', team: '👥',
  tennis: '🎾', toss: '🤾', track: '🏃', trainer: '🏋️', trek: '🥾', trot: '🐎',
  walk: '🚶', winner: '🏆', yoga: '🧘', zoom: '🚀',

  // ── Music & arts ──
  album: '💿', art: '🎨', artist: '🎨', band: '🎸', bass: '🎸', beat: '🥁',
  camera: '📷', choir: '🎤', cinema: '🎬', circus: '🎪', comedy: '😂', comic: '📚',
  concert: '🎤', dance: '💃', diary: '📖', drama: '🎭', drum: '🥁', essay: '📝',
  fiction: '📚', film: '🎬', guitar: '🎸', harp: '🪕', jazz: '🎷', magic: '🪄',
  movie: '🎬', museum: '🏛️', music: '🎵', opera: '🎭', paint: '🎨', painter: '🎨',
  photo: '📷', piano: '🎹', picture: '🖼️', poem: '📜', poetry: '📜', poster: '🖼️',
  radio: '📻', rhythm: '🥁', scene: '🎭', script: '📜', show: '🎬', sketch: '✏️',
  song: '🎵', sound: '🔊', speech: '🎤', stage: '🎭', story: '📖', studio: '🎙️',
  style: '✨', symbol: '🔣', tempo: '🎵', theater: '🎭', title: '🏷️', tone: '🎵',
  tune: '🎵', video: '🎥', voice: '🗣️', write: '✍️', writer: '✍️', writing: '✍️',

  // ── People & jobs ──
  actor: '🎭', agent: '🕵️', author: '✍️', banker: '🏦', boss: '👔', bride: '👰',
  captain: '⚓', chef: '👨‍🍳', chief: '👑', child: '🧒', citizen: '🏙️', clerk: '🗂️',
  coach: '🏋️', cop: '👮', cousin: '👨‍👩‍👧', dad: '👨', doctor: '🩺', driver: '🚗',
  farmer: '🌾', father: '👨', friend: '🤝', girl: '👧', god: '🙏', guard: '🛡️',
  guest: '🙋', guide: '🧭', guru: '🧘', guy: '👨', hero: '🦸', host: '🙋',
  human: '🧍', hunter: '🏹', infant: '🍼', judge: '⚖️', kid: '🧒', king: '👑',
  knight: '⚔️', lady: '👩', lawyer: '⚖️', leader: '👑', lord: '👑', maid: '🧹',
  major: '🎖️', manager: '📋', master: '🎓', mate: '🤝', mayor: '🏛️', member: '👥',
  model: '💃', mom: '👩', monk: '🧘', mother: '👩', nurse: '🩺', officer: '🎖️',
  owner: '🏠', parent: '👨‍👩‍👧', pilot: '✈️', police: '👮', prince: '🤴', queen: '👸',
  reader: '📖', rider: '🏇', ruler: '👑', saint: '😇', singer: '🎤', sir: '🤵',
  sister: '👧', soldier: '💂', speaker: '🎤', student: '🎓', teacher: '👩‍🏫',
  thief: '🦹', tourist: '🧳', uncle: '👨', veteran: '🎖️', vet: '🩺', visitor: '🚶',
  wife: '👰', woman: '👩', worker: '👷', youth: '🧒',

  // ── Everyday words ──
  city: '🏙️', day: '☀️', home: '🏠', hour: '⏰', love: '❤️', money: '💵',
  month: '📅', night: '🌙', school: '🏫', time: '⏰', week: '📅', year: '🗓️',

  // ── Two-word phrases (words with spaces) ──
  'hot dog': '🌭', 'ice cream': '🍨', 'star fish': '⭐', 'sea horse': '🐴', 'fire fly': '✨',
  'honey bee': '🐝', 'lady bug': '🐞', 'bull dog': '🐶', 'night owl': '🦉', 'pine tree': '🌲',
  'oak tree': '🌳', 'palm tree': '🌴', 'rain coat': '🧥', 'sun glass': '🕶️', 'tea cup': '🍵',
  'pea nut': '🥜', 'pop corn': '🍿', 'sea food': '🦞', 'fast food': '🍔', 'junk food': '🍟',
  'ice cube': '🧊', 'snow man': '⛄', 'snow ball': '⚪', 'sand box': '🏖️', 'tool box': '🧰',
  'trash can': '🗑️', 'mail box': '📮', 'note book': '📓', 'text book': '📚', 'bed room': '🛏️',
  'bath tub': '🛁', 'rain bow': '🌈', 'time out': '⏱️', 'work out': '🏋️', 'stand up': '🧍',
  'sit down': '🪑', 'come back': '🔙', 'go home': '🏠', 'take off': '✈️', 'show off': '😎',
  'look out': '👀', 'no body': '👤', 'some one': '🙋', 'any one': '👤', 'every one': '👥',
  'some day': '📅', 'birth day': '🎂', 'week end': '🏖️', 'week day': '📅', 'home work': '📝',
  'key board': '⌨️', 'mouse pad': '🖱️', 'hair cut': '💇', 'make up': '💄', 'wake up': '⏰',
  'hold on': '✋', 'get out': '🚪', 'run away': '🏃', 'walk away': '🚶', 'fall down': '🤕',
  'calm down': '🧘', 'slow down': '🐢', 'turn off': '🔌', 'turn on': '💡', 'log in': '🔑',
  'log out': '🚪', 'sign in': '✍️', 'sign up': '📝', 'log off': '🖥️', 'check in': '🛎️',
  'drop out': '🎓', 'fill in': '📝', 'hand out': '🤝', 'hang up': '📞', 'look for': '🔍',
  'wait for': '⏳', 'ask for': '🙏', 'pay for': '💳', 'care for': '💗', 'hope for': '🙏',
  'wait up': '⏳', 'hurry up': '🏃', 'speak up': '🗣️', 'cheer up': '🎉', 'dress up': '👗',
  'clean up': '🧹', 'warm up': '🔥', 'cool down': '❄️', 'pipe line': '🛢️', 'ice tea': '🧊',
  'hot tea': '☕', 'green tea': '🍵', 'black tea': '☕', 'milk tea': '🧋', 'sun set': '🌇',
  'sun rise': '🌅', 'sea shell': '🐚', 'star dust': '✨', 'day time': '☀️', 'bed time': '🛏️',
  'tea time': '🍵', 'play time': '🎮', 'game time': '🎲', 'rock star': '🎸', 'pop star': '⭐',
  'snow day': '⛄', 'rain day': '☔', 'sun hat': '👒', 'top hat': '🎩', 'bow tie': '🎀',
  'neck tie': '👔', 'bee hive': '🐝', 'ant hill': '🐜', 'pig pen': '🐷', 'cow boy': '🤠',
  'cow girl': '🤠', 'fire man': '🚒', 'mail man': '📬', 'milk man': '🥛', 'space man': '👨‍🚀',
  'bat man': '🦇', 'iron man': '🤖', 'hot sun': '☀️', 'dog house': '🐶', 'light up': '💡',
  'sit up': '🧎', 'mix up': '🔀', 'end up': '🏁', 'line up': '📏', 'set up': '⚙️',
  'pick up': '🤲', 'back up': '🔙', 'stand by': '⏸️', 'log on': '💻', 'jump in': '🏊',
  'jump out': '😲', 'run in': '🏃', 'walk in': '🚶', 'step up': '🪜', 'speed up': '🚀',
  'tune in': '📻', 'move on': '➡️', 'get on': '🚌', 'get up': '🛏️', 'give up': '🏳️',
  'go out': '🌃', 'eat out': '🍽️', 'dine out': '🍽️', 'head up': '⬆️', 'hold up': '✋',
  'keep up': '💪', 'tune up': '🎻', 'wash up': '🧼', 'wipe out': '🌊', 'zip up': '🤐',
  'zoom in': '🔍', 'cheer on': '📣', 'call out': '📢', 'bow wow': '🐶', 'hush up': '🤫'
};

// ── Long words (8 letters) — drawable ones only ──
Object.assign(WORD_ART, {
  airplane: '✈️', backpack: '🎒', calendar: '📅', computer: '💻', cucumber: '🥒',
  dinosaur: '🦕', dumpling: '🥟', earphone: '🎧', eggplant: '🍆', elephant: '🐘',
  envelope: '✉️', firework: '🎆', flamingo: '🦩', football: '⚽', fountain: '⛲',
  goldfish: '🐠', headache: '🤕', hospital: '🏥', kangaroo: '🦘', keyboard: '⌨️',
  lollipop: '🍭', lunchbox: '🍱', macaroni: '🍝', medicine: '💊', mosquito: '🦟',
  mountain: '⛰️', mushroom: '🍄', necklace: '📿', notebook: '📓', pharmacy: '💊',
  postcard: '💌', porridge: '🥣', raincoat: '🧥', sailboat: '⛵', sandwich: '🥪',
  scissors: '✂️', scorpion: '🦂', seahorse: '🐴', skeleton: '💀', squirrel: '🐿️',
  starfish: '⭐', sunshine: '☀️', textbook: '📚', tortoise: '🐢', treasure: '💎',
  trousers: '👖', umbrella: '☂️'
});

// ── Long two-word answers (drawable) ──
Object.assign(WORD_ART, {
  'apple pie': '🥧', 'cup cake': '🧁', 'pan cake': '🥞', 'hot cocoa': '☕', 'gum drop': '🍬'
});

// ── Clothes (so the Clothes category has drawable system-round words) ──
Object.assign(WORD_ART, {
  dress: '👗', fabric: '🧵', glove: '🧤', jacket: '🧥', jersey: '👕',
  outfit: '🧥', shirt: '👕', uniform: '🤵'
});

// ── Colors (complete the color set with drawable words) ──
Object.assign(WORD_ART, {
  bronze: '🥉', ivory: '🤍', pearl: '🫧', salmon: '🍣'
});

// ── More clothes (reduce repetition in Clothes-theme games) ──
Object.assign(WORD_ART, {
  cotton: '☁️', fashion: '🛍️', leather: '👜', linen: '🛏️', nylon: '🪢'
});

// ── More travel words ──
Object.assign(WORD_ART, {
  airline: '✈️', avenue: '🛣️', drive: '🚗', fleet: '🚢', motor: '🏎️',
  rental: '🚘', route: '🗺️', tourism: '🧳', trail: '🥾', travel: '🧭',
  vehicle: '🚛', wagon: '🛒'
});

// ── More body words ──
Object.assign(WORD_ART, {
  ankle: '🦶', health: '🩺', liver: '🫀', nerve: '⚡', tissue: '🧻'
});

// ── More sports words ──
Object.assign(WORD_ART, {
  arena: '🏟️', contest: '🏆', court: '🎾', derby: '🏇', dodge: '🤸',
  fight: '🥊', playing: '🎮', runner: '🏃', scout: '🏕️', shoot: '🎯',
  trial: '⚖️', walker: '🚶', winning: '🏅'
});

// ── Remaining animals ──
Object.assign(WORD_ART, {
  beast: '👹'
});

// ── Countries (flag emoji art; UK flag used for england/scotland/wales) ──
Object.assign(WORD_ART, {
  india: '🇮🇳', china: '🇨🇳', france: '🇫🇷', egypt: '🇪🇬', brazil: '🇧🇷', canada: '🇨🇦', japan: '🇯🇵', germany: '🇩🇪',
  italy: '🇮🇹', spain: '🇪🇸', mexico: '🇲🇽', turkey: '🇹🇷', poland: '🇵🇱', sweden: '🇸🇪', norway: '🇳🇴', denmark: '🇩🇰',
  portugal: '🇵🇹', greece: '🇬🇷', ireland: '🇮🇪', iceland: '🇮🇸', england: '🇬🇧', scotland: '🇬🇧', wales: '🇬🇧', russia: '🇷🇺',
  thailand: '🇹🇭', vietnam: '🇻🇳', malaysia: '🇲🇾', pakistan: '🇵🇰', nepal: '🇳🇵', bhutan: '🇧🇹', chile: '🇨🇱', nigeria: '🇳🇬',
  kenya: '🇰🇪', ghana: '🇬🇭', senegal: '🇸🇳', morocco: '🇲🇦', algeria: '🇩🇿', tunisia: '🇹🇳', sudan: '🇸🇩', somalia: '🇸🇴',
  ethiopia: '🇪🇹', tanzania: '🇹🇿', uganda: '🇺🇬', zambia: '🇿🇲', zimbabwe: '🇿🇼', angola: '🇦🇴', cyprus: '🇨🇾', jordan: '🇯🇴',
  israel: '🇮🇱', lebanon: '🇱🇧', syria: '🇸🇾', yemen: '🇾🇪', qatar: '🇶🇦', kuwait: '🇰🇼', saudi: '🇸🇦', bahrain: '🇧🇭',
  mongolia: '🇲🇳', taiwan: '🇹🇼', cambodia: '🇰🇭', myanmar: '🇲🇲', niger: '🇳🇪', congo: '🇨🇩', rwanda: '🇷🇼', malawi: '🇲🇼',
  namibia: '🇳🇦', botswana: '🇧🇼', guinea: '🇬🇳', liberia: '🇱🇷', armenia: '🇦🇲', georgia: '🇬🇪', ukraine: '🇺🇦', belarus: '🇧🇾',
  moldova: '🇲🇩', romania: '🇷🇴', bulgaria: '🇧🇬', hungary: '🇭🇺', austria: '🇦🇹', belgium: '🇧🇪', slovakia: '🇸🇰', slovenia: '🇸🇮',
  croatia: '🇭🇷', bosnia: '🇧🇦', serbia: '🇷🇸', albania: '🇦🇱', estonia: '🇪🇪', latvia: '🇱🇻', finland: '🇫🇮', andorra: '🇦🇩',
  malta: '🇲🇹', monaco: '🇲🇨', ecuador: '🇪🇨', colombia: '🇨🇴', bolivia: '🇧🇴', paraguay: '🇵🇾', uruguay: '🇺🇾', guyana: '🇬🇾',
  panama: '🇵🇦', honduras: '🇭🇳', haiti: '🇭🇹', jamaica: '🇯🇲', trinidad: '🇹🇹', barbados: '🇧🇧', bahamas: '🇧🇸', grenada: '🇬🇩',
  samoa: '🇼🇸', papua: '🇵🇬', solomon: '🇸🇧', puerto: '🇵🇷'
});

function getWordArt(word) {
  return WORD_ART[word] || null;
}

module.exports = { WORD_ART, getWordArt };

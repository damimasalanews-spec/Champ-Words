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

// ── Category pack expansions (common words so every theme has 50+ picks) ──
// Animals
Object.assign(WORD_ART, {
  bear: '🐻', lion: '🦁', giraffe: '🦒', zebra: '🦓', gorilla: '🦍', chimp: '🐒',
  koala: '🐨', panda: '🐼', penguin: '🐧', parrot: '🦜', owl: '🦉', hawk: '🦅',
  duck: '🦆', goose: '🪿', swan: '🦢', chicken: '🐔', rooster: '🐓', hen: '🐔',
  pigeon: '🕊️', crow: '🐦⬛', raven: '🐦⬛', sparrow: '🐦', peacock: '🦚', ostrich: '🦤',
  camel: '🐫', donkey: '🫏', cow: '🐄', bull: '🐂', goat: '🐐', pig: '🐖', dog: '🐶',
  cat: '🐱', rabbit: '🐰', hare: '🐇', rat: '🐀', fox: '🦊', wolf: '🐺', deer: '🦌',
  moose: '🫎', elk: '🫎', raccoon: '🦝', skunk: '🦨', hedgehog: '🦔', bat: '🦇',
  whale: '🐋', dolphin: '🐬', seal: '🦭', walrus: '🦭', octopus: '🐙', squid: '🦑',
  crab: '🦀', lobster: '🦞', shrimp: '🦐', snail: '🐌', turtle: '🐢', frog: '🐸',
  toad: '🐸', lizard: '🦎', crocodile: '🐊', alligator: '🐊', bee: '🐝', wasp: '🐝',
  ant: '🐜', spider: '🕷️', butterfly: '🦋', moth: '🦋', worm: '🪱', bug: '🐛',
  beetle: '🪲', ladybug: '🐞'
});
// Food
Object.assign(WORD_ART, {
  lime: '🍋', berry: '🫐', strawberry: '🍓', blueberry: '🫐', watermelon: '🍉',
  melon: '🍈', peach: '🍑', pear: '🍐', plum: '🟣', mango: '🥭', pineapple: '🍍',
  coconut: '🥥', kiwi: '🥝', avocado: '🥑', tomato: '🍅', carrot: '🥕', onion: '🧅',
  corn: '🌽', pea: '🫛', bean: '🫘', rice: '🍚', cake: '🎂', pie: '🥧', cookie: '🍪',
  donut: '🍩', muffin: '🧁', croissant: '🥐', bagel: '🥯', burger: '🍔', taco: '🌮',
  noodle: '🍜', cheese: '🧀', egg: '🥚', bacon: '🥓', ham: '🍖', sausage: '🌭',
  fish: '🐟', sushi: '🍣', soup: '🍲', milk: '🥛', chocolate: '🍫', fries: '🍟'
});
// Nature
Object.assign(WORD_ART, {
  sun: '☀️', moon: '🌙', star: '⭐', rain: '🌧️', snow: '❄️', wind: '💨', rainbow: '🌈',
  tree: '🌳', leaf: '🍃', flower: '🌸', rose: '🌹', tulip: '🌷', hill: '⛰️', lake: '🏞️',
  sea: '🌊', wave: '🌊', sand: '🏖️', island: '🏝️', desert: '🏜️', canyon: '🏞️',
  cave: '🕳️', rock: '🪨', stone: '🪨', crystal: '🔮', ice: '🧊', fire: '🔥', sky: '🌌',
  sunset: '🌇', lightning: '⚡', thunder: '⛈️', tornado: '🌪️', hurricane: '🌀',
  glacier: '🏔️', valley: '🏞️', meadow: '🌼', planet: '🪐', comet: '☄️', meteor: '☄️',
  galaxy: '🌌', seed: '🌱', plant: '🪴', bush: '🌳', branch: '🌿', root: '🌱',
  log: '🪵', moss: '🍀', pine: '🌲', palm: '🌴', cactus: '🌵'
});
// Body
Object.assign(WORD_ART, {
  head: '👤', face: '🙂', eye: '👁️', eyes: '👀', ear: '👂', nose: '👃', lip: '👄',
  tooth: '🦷', hair: '💇', lung: '🫁', bone: '🦴', skin: '🤚', arm: '💪', hand: '✋',
  nail: '💅', leg: '🦵', foot: '🦶', knee: '🦵', elbow: '💪', shoulder: '🤷', neck: '🧣',
  back: '🔙', chest: '🫁', belly: '🤰', beard: '🧔', mustache: '👨', eyebrow: '🤨',
  cheek: '😊', chin: '🤔', forehead: '🤕', skull: '💀', wrist: '⌚'
});
// Home
Object.assign(WORD_ART, {
  home: '🏠', door: '🚪', roof: '🏠', wall: '🧱', bedroom: '🛏️', bathroom: '🛁',
  sofa: '🛋️', desk: '🪑', bed: '🛏️', pillow: '🛏️', rug: '🧶', carpet: '🧶',
  curtain: '🪟', oven: '🍳', sink: '🚰', toilet: '🚽', shower: '🚿', towel: '🧻',
  broom: '🧹', plate: '🍽️', bowl: '🥣', cup: '☕', fork: '🍴', pan: '🍳', pot: '🍲',
  kettle: '🫖', jar: '🫙', box: '📦', basket: '🧺', key: '🔑', lock: '🔒', bell: '🔔',
  phone: '📱', newspaper: '📰', tv: '📺', radio: '📻', fan: '🌀', garage: '🚗',
  stairs: '🪜', balcony: '🏢', porch: '🏠', fence: '🪵', gate: '⛩️', yard: '🏡'
});
// Clothes
Object.assign(WORD_ART, {
  pants: '👖', jeans: '👖', shorts: '🩳', skirt: '👗', coat: '🧥', sweater: '🧶',
  vest: '🦺', suit: '🤵', tie: '👔', scarf: '🧣', hat: '🎩', cap: '🧢', mitten: '🧤',
  sock: '🧦', shoe: '👟', boot: '🥾', sandal: '🩴', slipper: '🩴', sneaker: '👟',
  belt: '🥋', button: '🔘', pocket: '👖', zipper: '🤐', pajama: '🛌', gown: '👗',
  cloak: '🧥', cape: '🦸', crown: '👑', ring: '💍', bracelet: '📿', watch: '⌚',
  sunglasses: '🕶️', purse: '👛', wallet: '👛', backpack: '🎒', bag: '👜', umbrella: '☂️',
  raincoat: '🧥', swimsuit: '🩱', apron: '👩'
});
// Travel
Object.assign(WORD_ART, {
  car: '🚗', bus: '🚌', van: '🚐', taxi: '🚕', boat: '⛵', ship: '🚢', canoe: '🛶',
  kayak: '🛶', rocket: '🚀', bicycle: '🚲', bike: '🚲', motorcycle: '🏍️', scooter: '🛵',
  helicopter: '🚁', balloon: '🎈', jet: '✈️', submarine: '🛥️', trolley: '🚎',
  compass: '🧭', map: '🗺️', globe: '🌍', airport: '🛫', station: '🚉', road: '🛣️',
  street: '🏙️', bridge: '🌉', tunnel: '🚇', hotel: '🏨', ticket: '🎫', passport: '🛂',
  luggage: '🧳', suitcase: '🧳', cruise: '🚢', safari: '🦁', pier: '⛵',
  lighthouse: '🗼', journey: '🧭', tour: '🧭', trip: '🧳', voyage: '⛵'
});
// Sports
Object.assign(WORD_ART, {
  soccer: '⚽', basketball: '🏀', baseball: '⚾', tennis: '🎾', cricket: '🏏', golf: '⛳',
  hockey: '🏒', volleyball: '🏐', rugby: '🏉', boxing: '🥊', wrestling: '🤼',
  karate: '🥋', judo: '🥋', fencing: '🤺', archery: '🏹', skiing: '🎿', snowboard: '🏂',
  skating: '⛸️', surfing: '🏄', swimming: '🏊', running: '🏃', jogging: '🏃',
  sprint: '🏃', marathon: '🏅', cycling: '🚴', gym: '🏋️', workout: '🏋️', yoga: '🧘',
  dancing: '💃', trophy: '🏆', medal: '🥇', stadium: '🏟️', referee: '🧑', player: '🏃',
  team: '👥', coach: '📣', champion: '🏆', winner: '🥇', race: '🏁', match: '⚔️',
  goal: '🥅', ball: '⚽', helmet: '⛑️'
});
// Arts
Object.assign(WORD_ART, {
  song: '🎵', sing: '🎤', dance: '💃', piano: '🎹', drum: '🥁', violin: '🎻',
  flute: '🪈', trumpet: '🎺', saxophone: '🎷', harp: '🪕', microphone: '🎤',
  band: '🎸', orchestra: '🎻', cinema: '🎬', painting: '🖼️', canvas: '🖼️',
  draw: '✏️', sketch: '✏️', museum: '🏛️', gallery: '🖼️', statue: '🗿',
  sculpture: '🗿', theater: '🎭', stage: '🎭', drama: '🎭', comedy: '😂', opera: '🎭',
  ballet: '🩰', poetry: '📜', poem: '📜', novel: '📖', writer: '✍️', story: '📖',
  fairy: '🧚', puppet: '🪆', costume: '🎭', clown: '🤡', magician: '🪄'
});
// Colors
Object.assign(WORD_ART, {
  white: '⬜', red: '🟥', blue: '🟦', purple: '🟪', pink: '🩷', brown: '🟤',
  gray: '🩶', grey: '🩶', gold: '🥇', ruby: '🔴', emerald: '💚', sapphire: '💙',
  amber: '🟠', jade: '🟩', lime: '🟩', navy: '🟦', teal: '🩵', maroon: '🟫',
  crimson: '🔴', violet: '🟣', magenta: '🩷', turquoise: '🩵', indigo: '🟣',
  beige: '🟤', tan: '🟤', peach: '🍑', mint: '🟩', sky: '🩵', ocean: '🌊',
  snow: '❄️', coal: '⬛', ash: '🌫️', lemon: '🍋', plum: '🟣', berry: '🫐',
  flame: '🔥'
});
// People
Object.assign(WORD_ART, {
  man: '👨', woman: '👩', boy: '👦', girl: '👧', baby: '👶', child: '🧒',
  adult: '🧑', family: '👨', mother: '👩', father: '👨', brother: '👦', son: '👦',
  daughter: '👧', grandma: '👵', grandpa: '👴', uncle: '🧔', aunt: '👩', wife: '💍',
  husband: '💍', groom: '🤵', bride: '👰', prince: '🤴', knight: '🛡️', wizard: '🧙',
  witch: '🧙', fairy: '🧚', elf: '🧝', giant: '🗿', dwarf: '🧌', pirate: '🏴',
  cowboy: '🤠', robot: '🤖', alien: '👽', ghost: '👻', vampire: '🧛', zombie: '🧟',
  mermaid: '🧜', superhero: '🦸', doctor: '👨', nurse: '👩', teacher: '👩',
  student: '🧑', police: '👮', soldier: '💂', sailor: '⛵', chef: '👨', waiter: '🤵',
  cashier: '🧑', lawyer: '⚖️', scientist: '👩', engineer: '👷', musician: '🎸',
  singer: '🎤', dancer: '💃', athlete: '🏃', boxer: '🥊', ninja: '🥷', samurai: '⚔️',
  hero: '🦸', villain: '🦹', monster: '👹', angel: '👼', devil: '😈'
});
// Trade
Object.assign(WORD_ART, {
  ship: '🚢', boat: '⛵', box: '📦', package: '📦', parcel: '📦', letter: '✉️',
  mail: '✉️', stamp: '📮', computer: '💻', printer: '🖨️', paper: '📄', pen: '🖊️',
  pencil: '✏️', folder: '📁', briefcase: '💼', suitcase: '🧳', coin: '🪙',
  dollar: '💵', bank: '🏦', store: '🏪', shop: '🏬', market: '🏪', factory: '🏭',
  office: '🏢', scale: '⚖️', weight: '🏋️', price: '🏷️', tag: '🏷️', label: '🏷️',
  receipt: '🧾', contract: '📝', document: '📄', safe: '🔒'
});

// ── Dictionary-expansion art (5–8 letter words added to words.txt) ───────
Object.assign(WORD_ART, {
  // Animals
  badger: '🦡', beaver: '🦫', buffalo: '🐃', bunny: '🐰', cobra: '🐍', coyote: '🐺',
  crane: '🦩', falcon: '🦅', ferret: '🦦', gazelle: '🦌', gecko: '🦎', gibbon: '🦧',
  gopher: '🐹', heron: '🦩', hippo: '🦛', hyena: '🐆', iguana: '🦎', jaguar: '🐆',
  lemur: '🐒', leopard: '🐆', llama: '🦙', lobster: '🦞', manatee: '🦭', otter: '🦦',
  panda: '🐼', panther: '🐆', pelican: '🦢', piranha: '🐟', platypus: '🦫', puffin: '🐧',
  python: '🐍', rabbit: '🐰', raven: '🐦⬛', rhino: '🦏', seagull: '🕊️', skunk: '🦨',
  sloth: '🦥', sparrow: '🐦', stork: '🕊️', tadpole: '🐸', tapir: '🐗', tortoise: '🐢',
  toucan: '🦜', trout: '🐟', viper: '🐍', vulture: '🦅', walrus: '🦭', weasel: '🦦',
  whale: '🐋', wombat: '🐨', zebra: '🦓',
  // Food
  almond: '🌰', apricot: '🍑', avocado: '🥑', biscuit: '🍪', broccoli: '🥦',
  caramel: '🍮', celery: '🥬', chili: '🌶️', clove: '🧄', cranberry: '🍒',
  cucumber: '🥒', custard: '🍮', dough: '🥖', dumpling: '🥟', eggplant: '🍆',
  fennel: '🌿', flour: '🌾', ginger: '🫚', granola: '🥣', guava: '🍈',
  hazelnut: '🌰', honey: '🍯', jalapeno: '🌶️', kale: '🥬', leek: '🥬', lentil: '🫘',
  lettuce: '🥬', lychee: '🍒', mango: '🥭', mustard: '🟡', nutmeg: '🌰', oatmeal: '🥣',
  okra: '🌱', olive: '🫒', omelet: '🍳', papaya: '🍈', parsley: '🌿', pickle: '🥒',
  pretzel: '🥨', prune: '🟣', pudding: '🍮', pumpkin: '🎃', quinoa: '🌾', radish: '🌶️',
  raisin: '🍇', salsa: '🫕', sesame: '🫘', spinach: '🥬', squash: '🎃', syrup: '🍯',
  tamale: '🌮', tofu: '🧊', vanilla: '🍦', walnut: '🌰', yogurt: '🥛', zucchini: '🥒',
  // Nature
  aster: '🌸', birch: '🌳', blossom: '🌸', boulder: '🪨', breeze: '🌬️', brook: '💧',
  cedar: '🌲', cliff: '🏔️', dune: '🏜️', fern: '🌿', fjord: '🏞️', frost: '❄️',
  glade: '🌳', gorge: '🏞️', grove: '🌳', heather: '🌸', lagoon: '🏝️', lilac: '🪻',
  lily: '🌺', mist: '🌫️', moss: '🍀', oasis: '🌴', orchid: '🌺', peak: '⛰️',
  pebble: '🪨', petal: '🌸', pine: '🌲', prairie: '🌾', reed: '🌾', ridge: '⛰️',
  shrub: '🌳', spark: '✨', summit: '🏔️', swamp: '🐊', thicket: '🌲', thorn: '🌵',
  tide: '🌊', vista: '🏞️', willow: '🌳', wood: '🪵',
  // Body
  abdomen: '🫃', ankle: '🦶', artery: '🩸', bladder: '🫙', digit: '🖐️', flesh: '🥩',
  forearm: '💪', gland: '🫁', gullet: '🫁', knuckle: '👊', marrow: '🦴', organ: '🫀',
  pelvis: '🦴', pulse: '🩺', spleen: '🫀', stomach: '🤢', temple: '🧠', thigh: '🍗',
  torso: '👤', waist: '🩰', wrist: '⌚', throat: '🗣️', shoulder: '🤷', muscle: '💪',
  cheek: '😊', tooth: '🦷', tongue: '👅', thumb: '👍', forehead: '🤕', eyebrow: '🤨',
  beard: '🧔', skull: '💀', spine: '🦴', chest: '🫁', belly: '🤰', liver: '🫀',
  kidney: '🫘', heart: '❤️', brain: '🧠', blood: '🩸',
  // Home
  armchair: '🛋️', basement: '🕳️', bathtub: '🛁', candle: '🕯️', cellar: '🕳️',
  chandelier: '💡', cupboard: '🚪', dish: '🍽️', furnace: '🔥', hall: '🚪',
  hallway: '🚪', hamper: '🧺', heater: '♨️', laundry: '🧺', mantel: '🕯️',
  mattress: '🛏️', pantry: '🧺', patio: '🏡', radiator: '♨️', shutter: '🪟',
  teapot: '🫖', toaster: '🍞', trash: '🗑️', vase: '🏺', wardrobe: '🚪', fridge: '🧊',
  oven: '🔥', sink: '🚰', toilet: '🚽', shower: '🚿', towel: '🧻', broom: '🧹',
  bucket: '🪣', plate: '🍽️', bowl: '🥣', cup: '☕', fork: '🍴', pan: '🍳', pot: '🍲',
  kettle: '🫖', jar: '🫙', basket: '🧺', key: '🔑', lock: '🔒', bell: '🔔', phone: '📱',
  tv: '📺', radio: '📻', fan: '🌀', stairs: '🪜', garden: '🌷', garage: '🚗',
  // Clothes
  apron: '🧑', beanie: '🧢', blazer: '🧥', blouse: '👚', brooch: '📿', buckle: '🥋',
  cardigan: '🧥', clogs: '🩰', fleece: '🐑', garter: '🩰', glasses: '👓', jacket: '🧥',
  jumper: '👕', kimono: '👘', mittens: '🧤', necktie: '👔', overalls: '👖', parka: '🧥',
  poncho: '🧥', pumps: '👠', sandal: '🩴', scarf: '🧣', shawl: '🧣', sleeve: '👕',
  slipper: '🩴', sneaker: '👟', sweater: '🧶', tights: '🩰', tunic: '👚', zipper: '🤐',
  gloves: '🧤', jeans: '👖', pants: '👖', shirt: '👕', shorts: '🩳', skirt: '👗',
  dress: '👗', socks: '🧦',
  // Travel
  airplane: '✈️', airport: '🛫', avenue: '🛣️', departure: '🛫', freeway: '🛣️',
  highway: '🛣️', lane: '🛣️', motel: '🏨', railway: '🚂', resort: '🏖️', subway: '🚇',
  terminal: '🚏', tourist: '🧳', tram: '🚋', voyage: '⛵', anchor: '⚓', cruise: '🛳️',
  harbor: '⛵', hotel: '🏨', journey: '🧭', luggage: '🧳', passport: '🛂', pier: '⛵',
  port: '⚓', route: '🗺️', station: '🚉', street: '🏙️', taxi: '🚕', trail: '🥾',
  train: '🚂', trip: '🧳', trolley: '🚎', tunnel: '🚇', bridge: '🌉', canyon: '🏞️',
  flight: '✈️', ticket: '🎫',
  // Sports
  archery: '🏹', badminton: '🏸', bowling: '🎳', cheer: '📣', diving: '🤿', gymnast: '🤸',
  javelin: '🎯', pitch: '⚾', referee: '🧑', rowing: '🚣', runner: '🏃', skate: '⛸️',
  skiing: '🎿', soccer: '⚽', sprint: '🏃', surfing: '🏄', swimmer: '🏊', tennis: '🎾',
  volleyball: '🏐', wrestler: '🤼', yoga: '🧘', race: '🏁', medal: '🥇', stadium: '🏟️',
  trophy: '🏆', boxing: '🥊', karate: '🥋', judo: '🥋', fencing: '🤺', hockey: '🏒',
  golf: '⛳', cricket: '🏏', baseball: '⚾', basketball: '🏀',
  // Arts
  ballet: '🩰', cello: '🎻', chorus: '👥', easel: '🎨', lyrics: '📝', melody: '🎵',
  mime: '🎭', palette: '🎨', portrait: '🖼️', rhythm: '🥁', sculpture: '🗿', sonnet: '📜',
  theatre: '🎭', theater: '🎭', trumpet: '🎺', violin: '🎻', actor: '🎭', artist: '🎨',
  painter: '🎨', singer: '🎤',
  // Colors
  amber: '🟠', beige: '🟤', blond: '👱', charcoal: '⬛', coral: '🪸', crimson: '🔴',
  indigo: '🟣', lavender: '🪻', lilac: '🪻', magenta: '🩷', maroon: '🟤', olive: '🫒',
  peach: '🍑', sapphire: '💙', scarlet: '🔴', violet: '🟣', cream: '🥛', mustard: '🟡',
  coffee: '☕', ginger: '🫚', honey: '🍯', lemon: '🍋', ocean: '🌊', rainbow: '🌈',
  sunset: '🌇', sunrise: '🌅', berry: '🫐', flame: '🔥', emerald: '💚', turquoise: '🩵',
  // People
  acrobat: '🤸', astronaut: '👨🚀', babysitter: '🍼', barber: '💈', blacksmith: '🔨',
  butcher: '🔪', butler: '🤵', carpenter: '🪚', clerk: '🧑', courier: '📦', cowboy: '🤠',
  detective: '🕵️', driver: '🚗', drummer: '🥁', engineer: '👷', fireman: '🚒',
  fisherman: '🎣', gardener: '🌱', guard: '💂', hunter: '🏹', librarian: '📚',
  lifeguard: '⛑️', maid: '🧹', mayor: '🏛️', mechanic: '🔧', miner: '⛏️', monk: '🧘',
  nanny: '🍼', officer: '👮', plumber: '🔧', postman: '📮', priest: '⛪', princess: '👸',
  professor: '👨🏫', reporter: '🎤', secretary: '🗂️', shepherd: '🐑', surgeon: '🥼',
  tailor: '🧵', thief: '🦹', trader: '🤝', waiter: '🤵', worker: '👷', writer: '✍️'
});

// ── Round-2 expansion: body, travel, sports, arts, colors, trade ─────────
Object.assign(WORD_ART, {
  // Body
  elbow: '🦵', tonsil: '🦷', earlobe: '👂', eyelash: '👁️', nostril: '👃', molar: '🦷',
  biceps: '💪', dimple: '😊', freckle: '🤎', wrinkle: '👵', tummy: '🤰', tendon: '🩻',
  reflex: '⚡', sneeze: '🤧', blink: '👁️', frown: '🙁', giggle: '😂', laugh: '😂',
  breath: '🌬️', throat: '🗣️',
  // Travel
  caboose: '🚂', caravan: '🚐', carousel: '🎠', charter: '🚤', depot: '🚉',
  motorway: '🛣️', seaport: '⚓', sidewalk: '🚶', steamer: '🚢', turnpike: '🛣️',
  viaduct: '🌉', walkway: '🚶', waterway: '🚣', camping: '🏕️', picnic: '🧺',
  landmark: '🗼', scenery: '🏞️', skyline: '🌆', frontier: '🛂', customs: '🛃',
  baggage: '🧳', boarding: '🛫', runway: '🛬', hangar: '✈️', cockpit: '🛫',
  airship: '🎈', glider: '🪁', shuttle: '🚀', launch: '🚀',
  // Sports
  hurdle: '🏃', pushup: '💪', situp: '🤸', squat: '🏋️', barbell: '🏋️', weights: '🏋️',
  exercise: '🏃', training: '🏋️', mascot: '🐻', huddle: '👥', inning: '⚾',
  wicket: '🏏', pitcher: '⚾', catcher: '🧤', batter: '🏏', bowler: '🎳', goalie: '🧤',
  dribble: '🏀', block: '🧱',
  // Arts
  tragedy: '🎭', verse: '📜', stanza: '📜', rhyme: '🎵', prose: '📖', cartoon: '🎨',
  anime: '🎌', manga: '📖', vinyl: '💿', record: '💿', banjo: '🪕', bugle: '🎺',
  cymbals: '🥁', kazoo: '🎺', mandolin: '🪕', maracas: '🪇', piccolo: '🪈',
  ukulele: '🪕', clarinet: '🎷', trombone: '🎺', viola: '🎻', perform: '🎭',
  producer: '🎬', director: '🎬',
  // Colors
  burgundy: '🍷', chestnut: '🌰', cinnamon: '🟤', cobalt: '🔵', denim: '👖',
  ebony: '⬛', fuchsia: '🩷', khaki: '🫒', mauve: '🟣', ochre: '🟠', platinum: '⚪',
  sepia: '🟤', sienna: '🟤', taupe: '🟤', topaz: '💎', avocado: '🥑',
  // Trade
  auction: '🔨', broker: '🤝', budget: '💰', business: '💼', cargo: '📦',
  commerce: '🛒', credit: '💳', currency: '💱', customer: '🧑', dealer: '🚗',
  delivery: '📦', deposit: '🏦', discount: '🏷️', export: '🚢', finance: '📊',
  freight: '🚛', goods: '📦', import: '📥', invoice: '🧾', merchant: '🏪',
  order: '📋', payment: '💳', purchase: '🛍️', refund: '↩️', revenue: '📈',
  salary: '💵', sales: '🛒', shipment: '📦', shipping: '🚚', supplier: '🏭',
  trade: '🤝', vendor: '🏪', yield: '🌾'
});

// ── Removed words: ambiguous multi-meaning or un-drawable for clean rounds ─
// One drawing should map to ONE obvious word. Removed: classic polysemes
// (bat, seal, spring, mouse, rock, nail, palm, chest…), wrong/generic clipart
// (mole 🐹, crane 🦩, plum 🫐, anime 🎌…), abstract concepts (style, symbol,
// hour, member, budget…), phrasal verbs that can't be drawn ("turn off",
// "hold on"…) and uncommon words players won't guess from the art (wren,
// fawn, glen, isle…). Removing the entry here removes it from every
// difficulty band (easy/medium/hard = word length) and from category picks
// (champ choices only use words with art).
const REMOVED_WORDS = [
  // ── Ambiguous multi-meaning words ──
  'bat', 'seal', 'spring', 'mouse', 'mice', 'rock', 'crane', 'nail', 'palm',
  'chest', 'back', 'head', 'face', 'heel', 'hip', 'arm', 'neck', 'rib', 'foot',
  'organ', 'temple', 'ring', 'club', 'court', 'field', 'net', 'score', 'track',
  'race', 'play', 'show', 'beat', 'band', 'bass', 'record', 'coach', 'master',
  'mate', 'model', 'ruler', 'member', 'plain', 'light', 'fan', 'park', 'pitch',
  'match', 'mole', 'calf', 'ram', 'fly', 'bay', 'glass', 'bank', 'mouse', 'saw',
  'stick', 'spring', 'stamp', 'bow', 'gum', 'cast', 'mint', 'cream', 'toast',
  'lime', 'golden', 'spice', 'syrup', 'sugar', 'snack', 'stew', 'toast',
  // ── Wrong / misleading clipart ──
  'eel', 'lark', 'wren', 'robin', 'heron', 'pelican', 'puffin', 'seagull',
  'stork', 'platypus', 'tapir', 'manatee', 'walrus', 'wombat', 'gopher',
  'lemur', 'gibbon', 'ferret', 'weasel', 'hyena', 'coyote', 'yak', 'mule',
  'mare', 'pony', 'fawn', 'stag', 'hog', 'beast', 'cod', 'clam', 'plum',
  'bunny', 'pup', 'hen',
  'prune', 'squash', 'tofu', 'mustard', 'clove', 'fennel', 'parsley', 'quinoa',
  'granola', 'salsa', 'tamale', 'guava', 'lychee', 'papaya', 'apricot',
  'cranberry', 'hazelnut', 'almond', 'walnut', 'nutmeg', 'raisin', 'sesame',
  'lentil', 'pickle', 'radish', 'cinnamon', 'mud', 'moss', 'ash', 'clay',
  'dew', 'dune', 'dusk', 'dawn', 'east', 'north', 'south', 'west', 'earth',
  'fog', 'frost', 'gale', 'glen', 'grove', 'harbor', 'haven', 'horizon',
  'isle', 'land', 'mist', 'moor', 'orbit', 'ozone', 'peak', 'pond', 'reef',
  'ridge', 'rocky', 'sandy', 'season', 'shadow', 'slope', 'soil', 'solar',
  'stream', 'summer', 'sunny', 'surf', 'tide', 'warmth', 'weather', 'world',
  'cheek', 'chin', 'jaw', 'kidney', 'knee', 'limb', 'shin', 'spine', 'toe',
  'vein', 'waist', 'wrist', 'elbow', 'tonsil', 'earlobe', 'eyelash', 'nostril',
  'molar', 'dimple', 'freckle', 'wrinkle', 'tummy', 'tendon', 'reflex',
  'blink', 'frown', 'giggle', 'breath', 'throat', 'shoulder', 'abdomen',
  'artery', 'bladder', 'digit', 'flesh', 'forearm', 'gland', 'gullet',
  'knuckle', 'marrow', 'pelvis', 'pulse', 'spleen', 'stomach', 'thigh',
  'torso', 'forehead', 'eyebrow', 'belly', 'liver', 'ceiling', 'chain',
  'cloth', 'closet', 'counter', 'cushion', 'drawer', 'floor', 'glass',
  'handle', 'lid', 'mat', 'peg', 'pocket', 'roof', 'room', 'rug', 'sheet',
  'stair', 'table', 'tape', 'tile', 'tin', 'tray', 'wire', 'wok', 'yard',
  'desk', 'fridge', 'kitchen', 'oven', 'stove', 'lamp', 'flight', 'lane',
  'tour', 'avenue', 'drive', 'fleet', 'motor', 'rental', 'route', 'tourism',
  'trail', 'travel', 'vehicle', 'wagon', 'airline', 'cruise', 'safari',
  'pier', 'lighthouse', 'journey', 'trip', 'voyage', 'submarine', 'terminal',
  'resort', 'motel', 'freeway', 'departure', 'port', 'hangar', 'cockpit',
  'airship', 'glider', 'shuttle', 'launch', 'caboose', 'caravan', 'charter',
  'depot', 'motorway', 'turnpike', 'seaport', 'sidewalk', 'walkway', 'steamer',
  'viaduct', 'waterway', 'landmark', 'scenery', 'skyline', 'frontier',
  'baggage', 'boarding', 'club', 'dive', 'jog', 'kick', 'league', 'park',
  'polo', 'rally', 'spar', 'spin', 'sport', 'tackle', 'team', 'toss',
  'trainer', 'trek', 'trot', 'zoom', 'arena', 'contest', 'derby', 'dodge',
  'fight', 'playing', 'scout', 'shoot', 'trial', 'walker', 'winning',
  'hurdle', 'pushup', 'situp', 'squat', 'barbell', 'weights', 'exercise',
  'training', 'mascot', 'huddle', 'inning', 'wicket', 'pitcher', 'catcher',
  'batter', 'bowler', 'goalie', 'dribble', 'block', 'javelin', 'cheer',
  'referee', 'sprint', 'marathon', 'player', 'champion', 'winner', 'pitch',
  'album', 'choir', 'comic', 'concert', 'diary', 'essay', 'fiction', 'jazz',
  'opera', 'painter', 'poetry', 'poster', 'rhythm', 'scene', 'script',
  'speech', 'studio', 'style', 'symbol', 'tempo', 'title', 'tone', 'tune',
  'voice', 'orchestra', 'canvas', 'gallery', 'sculpture', 'novel', 'costume',
  'magician', 'cello', 'chorus', 'easel', 'lyrics', 'melody', 'mime',
  'sonnet', 'theatre', 'tragedy', 'verse', 'stanza', 'rhyme', 'prose',
  'cartoon', 'anime', 'manga', 'vinyl', 'record', 'bugle', 'cymbals',
  'kazoo', 'mandolin', 'piccolo', 'ukulele', 'trombone', 'viola', 'perform',
  'producer', 'director', 'chief', 'citizen', 'clerk', 'cousin', 'god',
  'guest', 'guide', 'guru', 'guy', 'host', 'kid', 'lady', 'leader', 'lord',
  'major', 'manager', 'master', 'mate', 'member', 'model', 'owner', 'ruler',
  'sister', 'speaker', 'uncle', 'vet', 'visitor', 'wife', 'youth', 'family',
  'brother', 'son', 'daughter', 'aunt', 'husband', 'witch', 'giant',
  'superhero', 'sailor', 'waiter', 'cashier', 'scientist', 'engineer',
  'musician', 'athlete', 'samurai', 'villain', 'babysitter', 'blacksmith',
  'butcher', 'butler', 'carpenter', 'courier', 'lifeguard', 'nanny',
  'reporter', 'secretary', 'trader', 'day', 'hour', 'month', 'time', 'week',
  'year', 'headache', 'macaroni', 'pharmacy', 'seahorse', 'starfish',
  'parcel', 'market', 'scale', 'weight', 'price', 'label', 'contract',
  'document', 'safe', 'auction', 'broker', 'budget', 'business', 'cargo',
  'commerce', 'customer', 'dealer', 'delivery', 'deposit', 'discount',
  'export', 'finance', 'freight', 'goods', 'import', 'invoice', 'merchant',
  'order', 'payment', 'purchase', 'refund', 'revenue', 'salary', 'sales',
  'shipment', 'shipping', 'supplier', 'trade', 'vendor', 'yield',
  // ── Abstract / un-drawable phrasal verbs and odd phrases ──
  'air', 'breeze', 'show off', 'look out', 'no body', 'some one', 'any one',
  'every one', 'some day', 'time out', 'get out', 'walk away', 'fall down',
  'calm down', 'slow down', 'turn off', 'turn on', 'log in', 'log out',
  'sign in', 'sign up', 'log off', 'check in', 'drop out', 'fill in',
  'hand out', 'hang up', 'look for', 'wait for', 'ask for', 'pay for',
  'care for', 'hope for', 'wait up', 'hurry up', 'speak up', 'cheer up',
  'dress up', 'clean up', 'warm up', 'cool down', 'pipe line', 'ice tea',
  'sea food', 'fast food', 'junk food', 'star dust', 'rock star', 'snow day',
  'rain day', 'fire man', 'mail man', 'milk man', 'space man', 'bat man',
  'iron man', 'hot sun', 'light up', 'sit up', 'mix up', 'end up', 'line up',
  'set up', 'pick up', 'back up', 'stand by', 'log on', 'jump in', 'jump out',
  'run in', 'walk in', 'step up', 'speed up', 'tune in', 'move on', 'get on',
  'get up', 'give up', 'go out', 'eat out', 'dine out', 'head up', 'hold up',
  'keep up', 'tune up', 'wash up', 'wipe out', 'zip up', 'zoom in', 'cheer on',
  'call out', 'bow wow', 'hush up', 'sea horse', 'star fish', 'fire fly',
  'bull dog', 'honey bee', 'cow girl', 'sun glass', 'rain coat', 'pop corn',
  'snow ball', 'sand box', 'rain bow', 'sea shell', 'hot cocoa'
];
for (const w of REMOVED_WORDS) delete WORD_ART[w];

function getWordArt(word) {
  return WORD_ART[word] || null;
}

module.exports = { WORD_ART, getWordArt };

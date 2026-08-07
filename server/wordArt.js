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
  month: '📅', night: '🌙', school: '🏫', time: '⏰', week: '📅', year: '🗓️'
};

function getWordArt(word) {
  return WORD_ART[word] || null;
}

module.exports = { WORD_ART, getWordArt };

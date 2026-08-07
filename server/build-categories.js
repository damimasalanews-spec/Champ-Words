// ═══════════════════════════════════════════════════════════════════════
// build-categories.js — dev tool: classifies server/words.txt into themed
// categories and writes server/categories.js (used by the game at runtime).
// Run:  node build-categories.js
// ═══════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'words.txt'), 'utf-8');
const allWords = [...new Set(
  src.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 3 && w.length <= 8)
)];

// Curated exact-word lists (every word below exists in words.txt).
// Priority order decides which category wins when a word fits several.
const LISTS = {
  animals: `ant ape bat bear beast bee bird boar calf cat cattle chick clam cod colt cow crab crow deer dog dove duck eagle eel emu fawn fish flea fly fox frog gnat goat hare hawk hen hog horse insect lamb lark lion mare mice mole monkey moth mouse mule owl ox pig pony pup ram rat robin seal shark sheep snake stag swan tiger toad tuna wasp wolf worm wren yak animal dragon`.split(/\s+/),
  food: `ale apple bacon banana bean beef beer berry bread bun butter cake candy cherry chip coffee corn cream creamy date dinner dish dough drink egg feast fish flour food fry garlic grape gum ham honey ice jam juice juicy keg lemon lime loaf lunch malt meal meat menu milk mint nut oat oil olive orange oven pasta pea peanut pear pepper pie pizza plum pork potato pot rice roast roll rum salad salt sauce snack soda soy spice spoon steak stew sugar sweet syrup tea toast tuna water wheat wine wok yam`.split(/\s+/),
  nature: `air ash autumn bay beach breeze bush cave clay cliff cloud coast coral dawn desert dew dune dusk earth east fern field fire flame fog forest frost gale garden glen grass grove harbor harbour haven hill horizon ice island isle jungle lake land leaf light mist moon moor moss mud north ocean orbit ozone peak pine plain planet pond rain reef ridge river rock rocky sand sandy sea season shadow shore sky slope snow soil solar south spring star stone storm stream summer sun sunny surf swamp tide timber tree valley volcano warmth wave weather west wind winter wood world`.split(/\s+/),
  body: `ankle arm back beard blood bone brain breath cheek chest chin ear eye face finger fist foot hair hand head health heart heel hip jaw kidney knee leg limb lip liver lung mouth muscle nail nape neck nerve nose palm rib shin skull spine thumb tissue toe tongue vein waist wrist`.split(/\s+/),
  home: `basin bath bed bedroom bench bin blanket bolt book bottle bowl box brush bucket cabinet candle carpet ceiling chain chair chamber chest clock cloth closet couch counter cup cushion deck desk door drawer fan floor fridge glass hammer handle house hut jar jug key kitchen knife ladder lamp lid lock lodge mat mirror mop mug nail oven pad pan panel paper peg pen pencil pipe plate plug pocket pot quilt rack roof room rug sack shelf sheet shed shower sink sofa spoon stair stove table tablet tape tent tile tin towel tower tray tub vase wall wash watch web window wire wok yard`.split(/\s+/),
  clothes: `belt boot cap coat collar cotton dress fabric fashion fur garb glove hat heel hood jacket jean jersey knit lace leather linen mask nylon outfit robe sash shirt shoe silk sleeve sock suit tie uniform veil vest wig wool`.split(/\s+/),
  travel: `airline auto avenue bike boat bus cab car cart drive driver ferry fleet flight fly fuel gear highway jet lane motor plane rail rental ride road route sail ship street taxi tire tour tourism tourist tow track traffic trail train travel trip truck tube tunnel van vehicle wagon wheel yacht`.split(/\s+/),
  sports: `arena ball base bat bowl box camp chess club contest court dart derby disc dive dodge dunk field fight fitness flag game golf gym hike jog jump kick kite league match net park play playing polo race rally ride ring row rugby run runner running sail score scout shoot skate ski spar speed spin sport stadium swim tackle team tennis toss tour track trainer trek trial trot volt walk walker win winner winning yoga zoom`.split(/\s+/),
  arts: `album art artist band bass beat camera choir cinema circus comedy comic concert dance diary drama drum essay fable fiction film guitar harp jazz legend magic movie museum music opera paint painter pencil photo piano picture poem poetry poet poster prose radio rhythm scene script show sketch song sound speech spell stage star story studio style symbol tempo theater theme title tone tune video voice write writer writing written`.split(/\s+/),
  colors: `black blue bronze coral cream gold golden gray green grey ivory jade lime navy olive opal orange pearl pink plum red rose rosy ruby rust salmon sandy silver tan yellow`.split(/\s+/),
  people: `actor agent aunt author banker boss bride buddy buyer captain career chef chief child citizen clerk coach cop cousin crew dad dame dealer deputy doctor driver elder emperor enemy expert family farmer father fellow female fighter founder friend giant girl god guard guest guide guru guy hero host human hunter husband infant judge junior kid king knight lady lawyer leader lord lover maid major maker male man manager master mate mayor member men model mom monk mother noble nurse officer owner parent patron people person pilot pioneer poet police pope premier prince pupil queen reader rider rival ruler saint senator sheriff singer sir sister slave soldier son speaker student teacher tenant thief tourist trainer tribe uncle veteran vet visitor voter walker widow wife winner woman worker writer youth`.split(/\s+/)
};

const ORDER = ['animals', 'food', 'nature', 'body', 'home', 'clothes', 'travel', 'sports', 'arts', 'colors', 'people'];

const LABELS = {
  animals: 'Animals', food: 'Food & drink', nature: 'Nature',
  body: 'Body', home: 'Home & stuff', clothes: 'Clothes',
  travel: 'On the move', sports: 'Sports & games', arts: 'Music & arts',
  colors: 'Colors', people: 'People & jobs'
};

const ICONS = {
  animals: '🐾', food: '🍎', nature: '🌿', body: '💪', home: '🏠',
  clothes: '👕', travel: '🚗', sports: '⚽', arts: '🎵', colors: '🎨', people: '👤'
};

const words = {};
const seen = new Set();
for (const cat of ORDER) {
  words[cat] = [];
  for (const w of LISTS[cat]) {
    if (!allWords.includes(w)) continue;   // only words that exist in the dictionary
    if (seen.has(w)) continue;             // first category wins
    seen.add(w);
    words[cat].push(w);
  }
  words[cat].sort();
}
// Mixed = every dictionary word not claimed by a themed category
words.mixed = allWords.filter(w => !seen.has(w)).sort();

const list = [
  ...ORDER.map(id => ({ id, label: LABELS[id], icon: ICONS[id] })),
  { id: 'mixed', label: 'Surprise me', icon: '🎲' }
];

const out = `// AUTO-GENERATED by build-categories.js — do not edit by hand.
// Run \`node build-categories.js\` to regenerate from words.txt.
module.exports = {
  list: ${JSON.stringify(list, null, 2)},
  words: ${JSON.stringify(words, null, 2)}
};
`;

fs.writeFileSync(path.join(__dirname, 'categories.js'), out);
console.log('categories.js written');
for (const cat of [...ORDER, 'mixed']) {
  console.log(`  ${cat.padEnd(10)} ${String(words[cat].length).padStart(4)} words`);
}

export type Player = {
  id: string;
  name: string;
  socketId?: string;
  guesses: string[];
  isHost?: boolean;
};

export type GuessFeedback = Array<"correct" | "present" | "absent">;

function feedbackForGuess(secret: string, guess: string): GuessFeedback {
  const fb: GuessFeedback = Array(secret.length).fill("absent");
  const secretArr = secret.split("");
  // First pass: correct letters
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      fb[i] = "correct";
      secretArr[i] = ""; // consume
    }
  }
  // Second pass: present letters
  for (let i = 0; i < guess.length; i++) {
    if (fb[i] === "correct") continue;
    const idx = secretArr.indexOf(guess[i]);
    if (idx !== -1) {
      fb[i] = "present";
      secretArr[idx] = "";
    }
  }
  return fb;
}

export class Room {
  id: string;
  players: Map<string, Player> = new Map();
  secret: string | null = null;
  maxGuesses = 6;
  wordLength = 5;
  started = false;

  constructor(id: string) {
    this.id = id;
  }

  addPlayer(p: Player) {
    this.players.set(p.id, p);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
    if (this.players.size === 0) {
      // let the caller delete the room instance if needed
    }
  }

  setHost(playerId: string) {
    const p = this.players.get(playerId);
    if (p) {
      p.isHost = true;
    }
  }

  start(secretWord: string) {
    if (secretWord.length !== this.wordLength) throw new Error("Wrong length");
    this.secret = secretWord.toLowerCase();
    this.started = true;
    // clear guesses
    for (const p of this.players.values()) p.guesses = [];
  }

  makeGuess(playerId: string, guess: string) {
    if (!this.started || !this.secret) throw new Error("Game not started");
    guess = guess.toLowerCase();
    if (guess.length !== this.wordLength) throw new Error("Wrong length");
    const p = this.players.get(playerId);
    if (!p) throw new Error("Player not found");
    if (p.guesses.length >= this.maxGuesses) throw new Error("No guesses left");
    p.guesses.push(guess);
    const fb = feedbackForGuess(this.secret, guess);
    const correct = fb.every((x) => x === "correct");
    const outOfGuesses = p.guesses.length >= this.maxGuesses;
    return { feedback: fb, correct, outOfGuesses };
  }

  getState() {
    return {
      id: this.id,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        guessesCount: p.guesses.length,
        isHost: p.isHost || false
      })),
      started: this.started,
      wordLength: this.wordLength,
      maxGuesses: this.maxGuesses
    };
  }
}

export class GameManager {
  rooms: Map<string, Room> = new Map();
  words: string[] = [];

  constructor(words: string[]) {
    this.words = words.filter((w) => w.length === 5).map((w) => w.toLowerCase());
  }

  createRoom(roomId: string) {
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId) ?? null;
  }

  deleteRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  chooseRandomWord() {
    return this.words[Math.floor(Math.random() * this.words.length)];
  }
}

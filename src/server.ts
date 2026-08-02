import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { GameManager, Player } from "./game";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: "*" }
});

// load words
const wordsText = fs.readFileSync(path.join(__dirname, "words.txt"), "utf-8");
const words = wordsText.split(/\r?\n/).filter(Boolean);
const gm = new GameManager(words);

// REST endpoint to list rooms (simple)
app.get("/rooms", (req, res) => {
  const rooms = Array.from(gm.rooms.keys());
  res.json({ rooms });
});

// Socket.IO realtime events
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("create_room", (data: { roomId: string; playerId: string; name: string }, cb) => {
    const { roomId, playerId, name } = data;
    if (gm.getRoom(roomId)) return cb({ ok: false, error: "Room exists" });
    const room = gm.createRoom(roomId);
    const p: Player = { id: playerId, name, socketId: socket.id, guesses: [], isHost: true };
    room.addPlayer(p);
    socket.join(roomId);
    cb({ ok: true, state: room.getState() });
    io.to(roomId).emit("room_state", room.getState());
  });

  socket.on("join_room", (data: { roomId: string; playerId: string; name: string }, cb) => {
    const { roomId, playerId, name } = data;
    const room = gm.getRoom(roomId);
    if (!room) return cb({ ok: false, error: "No such room" });
    if (room.started) return cb({ ok: false, error: "Game already started" });
    const p: Player = { id: playerId, name, socketId: socket.id, guesses: [], isHost: false };
    room.addPlayer(p);
    socket.join(roomId);
    cb({ ok: true, state: room.getState() });
    io.to(roomId).emit("room_state", room.getState());
  });

  socket.on("start_game", (data: { roomId: string; secret?: string }, cb) => {
    const { roomId, secret } = data;
    const room = gm.getRoom(roomId);
    if (!room) return cb({ ok: false, error: "Room not found" });
    const chosen = secret ? secret.toLowerCase() : gm.chooseRandomWord();
    try {
      room.start(chosen);
      io.to(roomId).emit("game_started", { wordLength: room.wordLength });
      io.to(roomId).emit("room_state", room.getState());
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("make_guess", (data: { roomId: string; playerId: string; guess: string }, cb) => {
    const { roomId, playerId, guess } = data;
    const room = gm.getRoom(roomId);
    if (!room) return cb({ ok: false, error: "Room not found" });
    try {
      const result = room.makeGuess(playerId, guess);
      io.to(roomId).emit("guess_made", {
        playerId,
        guess,
        feedback: result.feedback,
        correct: result.correct
      });
      if (result.correct) {
        io.to(roomId).emit("game_over", { winner: playerId, secret: room.secret });
        room.started = false;
      } else if (result.outOfGuesses) {
        // optionally check if all players out of guesses
        const allOut = Array.from(room.players.values()).every((p) => p.guesses.length >= room.maxGuesses);
        if (allOut) {
          io.to(roomId).emit("game_over", { winner: null, secret: room.secret });
          room.started = false;
        }
      }
      io.to(roomId).emit("room_state", room.getState());
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("disconnecting", () => {
    // find player's rooms and remove them
    for (const roomId of socket.rooms) {
      if (gm.getRoom(roomId)) {
        const room = gm.getRoom(roomId)!;
        // find player by socket id
        const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
        if (player) {
          room.removePlayer(player.id);
          io.to(roomId).emit("room_state", room.getState());
          if (room.players.size === 0) {
            gm.deleteRoom(roomId);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

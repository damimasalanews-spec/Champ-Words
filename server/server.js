const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const WORDS = ['apple', 'banana', 'orange', 'grapes', 'rocket', 'planet', 'computer', 'javascript'];
const rooms = new Map();

function makeRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

function maskWord(word, letters) {
  return word.split('').map(ch => (letters && letters.has && letters.has(ch.toLowerCase()) ? ch : '_')).join('');
}

function sanitizeRoom(room) {
  return {
    id: room.id,
    players: room.players.map(p => ({ id: p.id, name: p.name })),
    masked: maskWord(room.word, room.letters || new Set()),
    attemptsLeft: room.attemptsLeft,
    state: room.state,
    host: room.host
  };
}

io.on('connection', socket => {
  socket.on('create_room', ({ name, maxPlayers = 6 } = {}, cb) => {
    const id = makeRoomId();
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const room = {
      id,
      host: socket.id,
      players: [{ id: socket.id, name: name || 'Host' }],
      word,
      letters: new Set(),
      wordGuesses: new Set(),
      state: 'waiting',
      maxPlayers,
      attemptsLeft: 6
    };
    rooms.set(id, room);
    socket.join(id);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
    io.to(id).emit('room_update', sanitizeRoom(room));
  });

  socket.on('join_room', ({ roomId, name } = {}, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.players.length >= room.maxPlayers) return cb && cb({ ok: false, error: 'Room full' });
    const player = { id: socket.id, name: name || 'Player' };
    room.players.push(player);
    socket.join(roomId);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
    io.to(roomId).emit('player_joined', { id: player.id, name: player.name });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
  });

  socket.on('start_game', ({ roomId } = {}, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.host !== socket.id) return cb && cb({ ok: false, error: 'Only host can start' });
    room.state = 'playing';
    room.letters = new Set();
    room.wordGuesses = new Set();
    room.attemptsLeft = 6;
    io.to(roomId).emit('game_started', sanitizeRoom(room));
    cb && cb({ ok: true, room: sanitizeRoom(room) });
  });

  socket.on('guess_letter', ({ roomId, letter } = {}, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return cb && cb({ ok: false, error: 'Invalid room/state' });
    letter = String(letter || '').toLowerCase();
    if (!/^[a-z]$/.test(letter)) return cb && cb({ ok: false, error: 'Invalid letter' });
    if (room.letters.has(letter)) return cb && cb({ ok: false, error: 'Already guessed' });

    room.letters.add(letter);
    if (!room.word.toLowerCase().includes(letter)) room.attemptsLeft--;

    const revealed = maskWord(room.word, room.letters);

    if (revealed.toLowerCase() === room.word.toLowerCase()) {
      room.state = 'finished';
      io.to(roomId).emit('game_over', { winner: socket.id, word: room.word });
      return cb && cb({ ok: true, revealed, attemptsLeft: room.attemptsLeft, finished: true });
    }

    if (room.attemptsLeft <= 0) {
      room.state = 'finished';
      io.to(roomId).emit('game_over', { winner: null, word: room.word });
      return cb && cb({ ok: true, revealed, attemptsLeft: room.attemptsLeft, finished: true });
    }

    io.to(roomId).emit('game_update', sanitizeRoom(room));
    cb && cb({ ok: true, revealed, attemptsLeft: room.attemptsLeft });
  });

  socket.on('guess_word', ({ roomId, word } = {}, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return cb && cb({ ok: false, error: 'Invalid room/state' });
    word = String(word || '').toLowerCase();
    if (!/^[a-z]+$/.test(word)) return cb && cb({ ok: false, error: 'Invalid word' });
    if (room.wordGuesses.has(word)) return cb && cb({ ok: false, error: 'Already guessed' });

    room.wordGuesses.add(word);
    if (word === room.word.toLowerCase()) {
      room.state = 'finished';
      io.to(roomId).emit('game_over', { winner: socket.id, word: room.word });
      return cb && cb({ ok: true, correct: true });
    } else {
      room.attemptsLeft--;
      if (room.attemptsLeft <= 0) {
        room.state = 'finished';
        io.to(roomId).emit('game_over', { winner: null, word: room.word });
      } else {
        io.to(roomId).emit('game_update', sanitizeRoom(room));
      }
      return cb && cb({ ok: true, correct: false, attemptsLeft: room.attemptsLeft });
    }
  });

  socket.on('leave_room', ({ roomId } = {}, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx !== -1) room.players.splice(idx, 1);
    socket.leave(roomId);
    if (room.players.length === 0) rooms.delete(roomId);
    else {
      if (room.host === socket.id) room.host = room.players[0].id;
      io.to(roomId).emit('room_update', sanitizeRoom(room));
    }
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    for (const [id, room] of rooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(id).emit('player_left', { id: socket.id });
        if (room.players.length === 0) rooms.delete(id);
        else {
          if (room.host === socket.id) room.host = room.players[0].id;
          io.to(id).emit('room_update', sanitizeRoom(room));
        }
      }
    }
  });
});

server.listen(PORT, () => console.log('listening on', PORT));
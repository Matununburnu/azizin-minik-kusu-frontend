const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Statik dosyalar (public/ içindekiler)
app.use(express.static('public'));

// Ana sayfa: index.html
app.get('/', (req, res) => {
  res.send('Server is running 🚀');
});

// Oyuncular (global, ama odalara göre filtreleyeceğiz)
let players = {};

io.on('connection', (socket) => {
  console.log('Oyuncu bağlandı:', socket.id);

  socket.on('join', (data) => {
    // Zorluk modunu al ve odaya katıl
    const difficulty = data.difficulty;
    socket.join(difficulty);

    // Oyuncuya started flag'i ekle (başlangıçta false)
    players[socket.id] = { id: socket.id, ...data, started: false };

    // Sadece aynı zorluk modundaki oyuncuları filtrele ve o odaya emit et
    const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
    io.to(difficulty).emit('players', roomPlayers);
  });

  socket.on('update', (data) => {
    if (players[socket.id]) {
      players[socket.id].y = data.y;
      players[socket.id].vy = data.vy;

      const difficulty = players[socket.id].difficulty;
      const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
      io.to(difficulty).emit('players', roomPlayers);
    }
  });

  socket.on('jump', (data) => {
    if (players[socket.id]) {
      players[socket.id].vy = data.vy;

      const difficulty = players[socket.id].difficulty;
      const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
      io.to(difficulty).emit('players', roomPlayers);
    }
  });

  // Yeni event: Oyuncu oyuna başladığında (flap ile tetiklenir)
  socket.on('startGame', () => {
    if (players[socket.id]) {
      players[socket.id].started = true;

      const difficulty = players[socket.id].difficulty;
      const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
      io.to(difficulty).emit('players', roomPlayers);
    }
  });

  socket.on('leave', () => {
    const difficulty = players[socket.id]?.difficulty;  // ← Burası kritik, const olmalı
    delete players[socket.id];

    if (difficulty) {
      // Odadan ayrıl (ama delete zaten kaldırıyor)
      socket.leave(difficulty);
      const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
      io.to(difficulty).emit('players', roomPlayers);
    }
  });

  socket.on('disconnect', () => {
    console.log('Oyuncu ayrıldı:', socket.id);
    const difficulty = players[socket.id]?.difficulty;  // ← Burası da kritik, const olmalı
    delete players[socket.id];

    if (difficulty) {
      const roomPlayers = Object.values(players).filter(p => p.difficulty === difficulty);
      io.to(difficulty).emit('players', roomPlayers);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor!`);
});
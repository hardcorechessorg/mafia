const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище комнат
const rooms = new Map();

// Роли для игры
const ROLES = {
  MAFIA: { id: 'mafia', name: 'Мафия', color: '#e94560' },
  CIVILIAN: { id: 'civilian', name: 'Мирный житель', color: '#8ac6d1' },
  SHERIFF: { id: 'sheriff', name: 'Шериф', color: '#4cc9f0' },
  DON: { id: 'don', name: 'Дон мафии', color: '#b30000' },
  DOCTOR: { id: 'doctor', name: 'Доктор', color: '#6fffb0' },
  MANIAC: { id: 'maniac', name: 'Маньяк', color: '#ff9a00' },
  COURTESAN: { id: 'courtesan', name: 'Куртизанка', color: '#ff6bcb' }
};

// Генерация ID комнаты
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Генерация ID игрока
function generatePlayerId() {
  return Math.random().toString(36).substring(2, 10);
}

// Создание новой комнаты
function createRoom(roomName, hostName, playerCount, selectedRoles) {
  const roomId = generateRoomId();
  
  const room = {
    id: roomId,
    name: roomName,
    hostId: null,
    playerCount: parseInt(playerCount),
    players: new Map(),
    roles: selectedRoles,
    revealed: false,
    createdAt: Date.now(),
    gameStarted: false
  };
  
  rooms.set(roomId, room);
  return roomId;
}

// Подключение игрока к комнате
function joinRoom(roomId, playerName, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  if (room.players.size >= room.playerCount) {
    return null; // Комната заполнена
  }
  
  // Проверяем, нет ли игрока с таким именем
  for (let player of room.players.values()) {
    if (player.name === playerName) return null;
  }
  
  const playerId = generatePlayerId();
  const player = {
    id: playerId,
    socketId: socketId,
    name: playerName,
    role: null,
    isHost: false,
    connected: true
  };
  
  room.players.set(playerId, player);
  
  // Если это первый игрок - делаем его ведущим
  if (room.players.size === 1) {
    player.isHost = true;
    room.hostId = playerId;
  }
  
  return { playerId, room };
}

// Перемешивание ролей
function shuffleRoles(roomId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  if (room.players.size < room.playerCount) return false;
  
  // Создаем массив ролей
  const rolesArray = [...room.roles];
  
  // Перемешиваем роли
  for (let i = rolesArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rolesArray[i], rolesArray[j]] = [rolesArray[j], rolesArray[i]];
  }
  
  // Раздаем роли игрокам
  const players = Array.from(room.players.values());
  players.forEach((player, index) => {
    player.role = rolesArray[index];
  });
  
  room.gameStarted = true;
  room.revealed = false;
  
  return true;
}

// Получение информации о комнате для игрока
function getRoomInfoForPlayer(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const player = room.players.get(playerId);
  if (!player) return null;
  
  // Формируем список игроков
  const players = Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    role: (room.revealed || player.isHost || p.id === playerId) ? p.role : null
  }));
  
  return {
    roomId: room.id,
    roomName: room.name,
    playerCount: room.playerCount,
    players: players,
    playerRole: player.role,
    isHost: player.isHost,
    revealed: room.revealed,
    gameStarted: room.gameStarted
  };
}

// Очистка неактивных комнат
setInterval(() => {
  const now = Date.now();
  const hours24 = 24 * 60 * 60 * 1000;
  
  for (let [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > hours24) {
      rooms.delete(roomId);
    }
  }
}, 60 * 60 * 1000); // Каждый час

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);
  
  // Создание комнаты
  socket.on('create-room', (data) => {
    const { roomName, playerCount, roles, playerName } = data;
    
    const roomId = createRoom(roomName, playerName, playerCount, roles);
    const { playerId, room } = joinRoom(roomId, playerName, socket.id);
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = playerId;
    
    // Отправляем информацию о комнате создателю
    const roomInfo = getRoomInfoForPlayer(roomId, playerId);
    socket.emit('room-created', roomInfo);
    
    console.log(`Комната создана: ${roomId} (${roomName})`);
  });
  
  // Присоединение к комнате
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    
    const joinResult = joinRoom(roomId, playerName, socket.id);
    if (!joinResult) {
      socket.emit('join-error', { message: 'Не удалось присоединиться к комнате' });
      return;
    }
    
    const { playerId, room } = joinResult;
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = playerId;
    
    // Отправляем информацию о комнате новому игроку
    const roomInfo = getRoomInfoForPlayer(roomId, playerId);
    socket.emit('room-joined', roomInfo);
    
    // Оповещаем всех в комнате о новом игроке
    io.to(roomId).emit('player-joined', {
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        connected: p.connected
      }))
    });
    
    console.log(`Игрок ${playerName} присоединился к комнате ${roomId}`);
  });
  
  // Перемешивание ролей
  socket.on('shuffle-roles', () => {
    const roomId = socket.roomId;
    const playerId = socket.playerId;
    
    if (!roomId || !playerId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (!player || !player.isHost) return;
    
    const success = shuffleRoles(roomId);
    if (success) {
      // Отправляем обновленную информацию всем игрокам
      for (let [pId, p] of room.players.entries()) {
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          const roomInfo = getRoomInfoForPlayer(roomId, pId);
          playerSocket.emit('roles-shuffled', roomInfo);
        }
      }
      
      io.to(roomId).emit('game-started');
    }
  });
  
  // Раскрытие ролей
  socket.on('reveal-roles', () => {
    const roomId = socket.roomId;
    const playerId = socket.playerId;
    
    if (!roomId || !playerId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (!player || !player.isHost) return;
    
    room.revealed = true;
    
    // Отправляем обновленную информацию всем игрокам
    for (let [pId, p] of room.players.entries()) {
      const playerSocket = io.sockets.sockets.get(p.socketId);
      if (playerSocket) {
        const roomInfo = getRoomInfoForPlayer(roomId, pId);
        playerSocket.emit('roles-revealed', roomInfo);
      }
    }
  });
  
  // Отключение игрока
  socket.on('disconnect', () => {
    console.log('Отключение:', socket.id);
    
    const roomId = socket.roomId;
    const playerId = socket.playerId;
    
    if (!roomId || !playerId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
      
      // Если отключился ведущий, назначаем нового
      if (player.isHost && room.players.size > 1) {
        const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected && p.id !== playerId);
        if (connectedPlayers.length > 0) {
          const newHost = connectedPlayers[0];
          newHost.isHost = true;
          room.hostId = newHost.id;
          
          // Оповещаем о новом ведущем
          io.to(roomId).emit('new-host', { hostId: newHost.id });
        }
      }
      
      // Оповещаем остальных игроков
      socket.to(roomId).emit('player-disconnected', {
        playerId: playerId,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          connected: p.connected
        }))
      });
    }
  });
  
  // Пинг для поддержания соединения
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// API маршруты
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }
  
  res.json({
    id: room.id,
    name: room.name,
    playerCount: room.playerCount,
    currentPlayers: room.players.size,
    gameStarted: room.gameStarted
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalRooms: rooms.size,
    totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.size, 0)
  });
});

// Обслуживание клиента
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

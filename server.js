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
  console.log(`Создана комната ${roomId}: "${roomName}" на ${playerCount} игроков`);
  return roomId;
}

// Подключение игрока к комнате
function joinRoom(roomId, playerName, socketId) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`Комната ${roomId} не найдена`);
    return null;
  }
  
  if (room.players.size >= room.playerCount) {
    console.log(`Комната ${roomId} заполнена (${room.players.size}/${room.playerCount})`);
    return null;
  }
  
  // Проверяем, нет ли игрока с таким именем
  for (let player of room.players.values()) {
    if (player.name === playerName) {
      console.log(`Игрок с именем "${playerName}" уже есть в комнате ${roomId}`);
      return null;
    }
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
    console.log(`Игрок ${playerName} назначен ведущим комнаты ${roomId}`);
  }
  
  console.log(`Игрок ${playerName} присоединился к комнате ${roomId} (${room.players.size}/${room.playerCount})`);
  return { playerId, room };
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
    // Показываем роль если: раскрыты роли ИЛИ это ведущий ИЛИ это сам игрок
    role: (room.revealed || player.isHost || p.id === playerId) ? p.role : null
  }));
  
  return {
    roomId: room.id,
    roomName: room.name,
    playerCount: room.playerCount,
    players: players,
    playerRole: player.role, // Всегда отправляем роль текущему игроку
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
      console.log(`Удалена старая комната: ${roomId}`);
    }
  }
}, 60 * 60 * 1000);

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);
  
  // Создание комнаты
  socket.on('create-room', (data) => {
    console.log('Запрос на создание комнаты:', data);
    const { roomName, playerCount, roles, playerName } = data;
    
    const roomId = createRoom(roomName, playerName, playerCount, roles);
    const joinResult = joinRoom(roomId, playerName, socket.id);
    
    if (!joinResult) {
      socket.emit('join-error', { message: 'Не удалось создать комнату' });
      return;
    }
    
    const { playerId, room } = joinResult;
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = playerId;
    
    // Отправляем информацию о комнате создателю
    const roomInfo = getRoomInfoForPlayer(roomId, playerId);
    socket.emit('room-created', roomInfo);
    
    console.log(`Комната создана: ${roomId} (${roomName}) для ${playerCount} игроков`);
  });
  
  // Присоединение к комнате
  socket.on('join-room', (data) => {
    console.log('Запрос на присоединение к комнате:', data);
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
    
    console.log(`Запрос на перемешивание ролей от игрока ${playerId} в комнате ${roomId}`);
    
    if (!roomId || !playerId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
      console.log(`Игрок ${playerId} не является ведущим`);
      return;
    }
    
    // Проверяем, что все игроки на месте
    if (room.players.size < room.playerCount) {
      console.log(`Не хватает игроков: ${room.players.size}/${room.playerCount}`);
      return;
    }
    
    // Создаем массив ролей
    const rolesArray = [...room.roles];
    console.log(`Роли для раздачи: ${rolesArray.join(', ')}`);
    
    // Перемешиваем роли
    for (let i = rolesArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rolesArray[i], rolesArray[j]] = [rolesArray[j], rolesArray[i]];
    }
    
    // Раздаем роли игрокам
    const players = Array.from(room.players.values());
    console.log(`Игроки в комнате: ${players.map(p => p.name).join(', ')}`);
    
    players.forEach((player, index) => {
      player.role = rolesArray[index];
      console.log(`Игроку ${player.name} выдана роль: ${rolesArray[index]}`);
    });
    
    room.gameStarted = true;
    room.revealed = false;
    
    // Отправляем обновленную информацию КАЖДОМУ игроку отдельно
    for (let [pId, p] of room.players.entries()) {
      const playerSocket = io.sockets.sockets.get(p.socketId);
      if (playerSocket) {
        const roomInfo = getRoomInfoForPlayer(roomId, pId);
        playerSocket.emit('roles-shuffled', roomInfo);
      }
    }
    
    console.log(`Роли разданы в комнате ${roomId}`);
  });
  
  // Раскрытие ролей
  socket.on('reveal-roles', () => {
    const roomId = socket.roomId;
    const playerId = socket.playerId;
    
    console.log(`Запрос на раскрытие ролей от игрока ${playerId} в комнате ${roomId}`);
    
    if (!roomId || !playerId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
      console.log(`Игрок ${playerId} не является ведущим`);
      return;
    }
    
    if (!room.gameStarted) {
      console.log('Игра еще не начата, роли не разданы');
      return;
    }
    
    room.revealed = true;
    
    // Отправляем обновленную информацию ВСЕМ игрокам
    for (let [pId, p] of room.players.entries()) {
      const playerSocket = io.sockets.sockets.get(p.socketId);
      if (playerSocket) {
        const roomInfo = getRoomInfoForPlayer(roomId, pId);
        playerSocket.emit('roles-revealed', roomInfo);
      }
    }
    
    console.log(`Роли раскрыты в комнате ${roomId}`);
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
      console.log(`Игрок ${player.name} отключился от комнаты ${roomId}`);
      
      // Если отключился ведущий, назначаем нового
      if (player.isHost && room.players.size > 1) {
        const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected && p.id !== playerId);
        if (connectedPlayers.length > 0) {
          const newHost = connectedPlayers[0];
          newHost.isHost = true;
          room.hostId = newHost.id;
          
          console.log(`Новый ведущий: ${newHost.name}`);
          
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
  const totalPlayers = Array.from(rooms.values()).reduce((sum, room) => sum + room.players.size, 0);
  
  res.json({
    totalRooms: rooms.size,
    totalPlayers: totalPlayers
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    uptime: process.uptime()
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

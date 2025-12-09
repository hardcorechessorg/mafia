const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Храним комнаты в памяти
const rooms = new Map();

// Генерация кода комнаты (4 символа)
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Список всех возможных ролей
const ALL_ROLES = {
    mafia: { name: 'Мафия', color: 'red' },
    civilian: { name: 'Мирный житель', color: 'blue' },
    sheriff: { name: 'Шериф', color: 'green' },
    doctor: { name: 'Доктор', color: 'lime' },
    don: { name: 'Дон мафии', color: 'darkred' }
};

io.on('connection', (socket) => {
    console.log('Новое соединение:', socket.id);
    
    // Создание комнаты
    socket.on('create-room', (data) => {
        const { playerName, playerCount, roles } = data;
        
        // Генерируем уникальный код комнаты
        let roomCode;
        do {
            roomCode = generateRoomCode();
        } while (rooms.has(roomCode));
        
        // Создаем комнату
        const room = {
            code: roomCode,
            host: socket.id,
            playerCount: parseInt(playerCount),
            roles: roles, // массив ролей для раздачи
            players: new Map(),
            revealed: false,
            createdAt: Date.now()
        };
        
        // Добавляем ведущего как первого игрока
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            role: null,
            isHost: true
        });
        
        rooms.set(roomCode, room);
        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        console.log(`Комната ${roomCode} создана, ведущий: ${playerName}`);
        
        socket.emit('room-created', {
            roomCode,
            players: Array.from(room.players.values())
        });
    });
    
    // Присоединение к комнате
    socket.on('join-room', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Комната не найдена' });
            return;
        }
        
        if (room.players.size >= room.playerCount) {
            socket.emit('error', { message: 'Комната заполнена' });
            return;
        }
        
        // Проверяем, нет ли игрока с таким именем
        for (let player of room.players.values()) {
            if (player.name === playerName) {
                socket.emit('error', { message: 'Имя уже занято' });
                return;
            }
        }
        
        // Добавляем игрока
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            role: null,
            isHost: false
        });
        
        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        console.log(`${playerName} присоединился к комнате ${roomCode}`);
        
        // Оповещаем всех в комнате о новом игроке
        io.to(roomCode).emit('player-joined', {
            players: Array.from(room.players.values())
        });
    });
    
    // Раздача ролей
    socket.on('deal-roles', () => {
        const roomCode = socket.roomCode;
        const room = rooms.get(roomCode);
        
        if (!room || socket.id !== room.host) {
            socket.emit('error', { message: 'Только ведущий может раздавать роли' });
            return;
        }
        
        if (room.players.size !== room.playerCount) {
            socket.emit('error', { 
                message: `Ждем еще ${room.playerCount - room.players.size} игроков` 
            });
            return;
        }
        
        // Перемешиваем роли
        const shuffledRoles = [...room.roles].sort(() => Math.random() - 0.5);
        
        // Раздаем роли игрокам
        let i = 0;
        for (let player of room.players.values()) {
            player.role = shuffledRoles[i];
            i++;
        }
        
        room.revealed = false;
        
        // Отправляем каждому игроку его роль
        for (let [playerId, player] of room.players) {
            const playerSocket = io.sockets.sockets.get(playerId);
            if (playerSocket) {
                playerSocket.emit('role-assigned', {
                    role: player.role,
                    players: Array.from(room.players.values()).map(p => ({
                        name: p.name,
                        role: p.isHost ? p.role : (room.revealed ? p.role : null)
                    }))
                });
            }
        }
        
        console.log(`Роли разданы в комнате ${roomCode}`);
    });
    
    // Показать роли всем
    socket.on('reveal-roles', () => {
        const roomCode = socket.roomCode;
        const room = rooms.get(roomCode);
        
        if (!room || socket.id !== room.host) {
            socket.emit('error', { message: 'Только ведущий может показывать роли' });
            return;
        }
        
        room.revealed = true;
        
        // Отправляем всем полный список с ролями
        io.to(roomCode).emit('roles-revealed', {
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                role: p.role
            }))
        });
    });
    
    // Отключение
    socket.on('disconnect', () => {
        const roomCode = socket.roomCode;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.players.delete(socket.id);
            
            // Если отключился ведущий
            if (socket.id === room.host && room.players.size > 0) {
                // Назначаем нового ведущего
                const newHost = room.players.values().next().value;
                newHost.isHost = true;
                room.host = newHost.id;
                
                io.to(roomCode).emit('new-host', { hostName: newHost.name });
            }
            
            // Если комната пустая, удаляем ее
            if (room.players.size === 0) {
                rooms.delete(roomCode);
                console.log(`Комната ${roomCode} удалена`);
            } else {
                io.to(roomCode).emit('player-left', {
                    players: Array.from(room.players.values())
                });
            }
        }
    });
});

// Удаляем старые комнаты каждые 5 минут
setInterval(() => {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    
    for (let [code, room] of rooms.entries()) {
        if (now - room.createdAt > hour) {
            rooms.delete(code);
            console.log(`Удалена старая комната ${code}`);
        }
    }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

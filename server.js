import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';


const app = express();
const server = http.createServer(app);
const io = new Server(server);


const rooms = {};


function genCode() {
return Math.random().toString(36).substring(2, 7).toUpperCase();
}


app.use(express.static(path.join(process.cwd(), 'client/dist')));


io.on('connection', socket => {
socket.on('create-room', ({ name }) => {
const room = genCode();
rooms[room] = {
host: socket.id,
players: [{ id: socket.id, name }]
};


socket.join(room);
socket.emit('room-created', { room, isHost: true });
io.to(room).emit('players-update', rooms[room].players.map(p => p.name));
});


socket.on('start-game', settings => {
console.log('Game started with settings:', settings);
});
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));

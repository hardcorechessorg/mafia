import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = {}; 
// rooms = { roomId: { host: socket, players: { socketId: role } } }

function send(socket, type, data = {}) {
  socket.send(JSON.stringify({ type, ...data }));
}

wss.on("connection", (socket) => {
  socket.id = Math.random().toString(36).slice(2);

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);
    const { type } = msg;

    if (type === "create_room") {
      const roomId = Math.random().toString(36).slice(2, 7);
      rooms[roomId] = { host: socket, players: {} };
      send(socket, "room_created", { roomId });
    }

    if (type === "join_room") {
      const { roomId, name } = msg;
      if (!rooms[roomId]) return send(socket, "error", { message: "Комната не найдена" });

      rooms[roomId].players[socket.id] = { socket, name, role: null };
      send(socket, "joined", { roomId });
      send(rooms[roomId].host, "player_list", {
        players: Object.values(rooms[roomId].players).map(p => p.name)
      });
    }

    if (type === "assign_roles") {
      const { roomId, roles } = msg;
      const room = rooms[roomId];
      const sockets = Object.values(room.players);

      const shuffled = [...sockets].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, i) => {
        p.role = roles[i] || "Мирный житель";
        send(p.socket, "your_role", { role: p.role });
      });
    }
  });

  socket.on("close", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      delete room.players[socket.id];
      if (room.host === socket) delete rooms[roomId];
    }
  });
});

server.listen(8080, () => console.log("Server online on port 8080"));

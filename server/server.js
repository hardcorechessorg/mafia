import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Хранилище комнат
const rooms = {};

// Создать комнату
app.post("/create-room", (req, res) => {
    const { roomId, roles } = req.body;

    rooms[roomId] = {
        players: [],
        rolesConfig: roles, // { mafia: 2, doctor: 1, detective: 1, ... }
        assigned: false,
    };

    res.json({ success: true });
});

// Подключение игрока
app.post("/join-room", (req, res) => {
    const { roomId, playerId } = req.body;

    if (!rooms[roomId]) {
        return res.json({ success: false, error: "Комната не существует" });
    }

    rooms[roomId].players.push({
        id: playerId,
        role: null,
        ws: null
    });

    res.json({ success: true });
});

// Запуск игры — рандомная выдача ролей
app.post("/start-game", (req, res) => {
    const { roomId } = req.body;

    const room = rooms[roomId];
    if (!room) return res.json({ success: false });

    const players = room.players;
    const rolesArray = [];

    // Собираем роли
    for (let role in room.rolesConfig) {
        for (let i = 0; i < room.rolesConfig[role]; i++) {
            rolesArray.push(role);
        }
    }

    // Остальные — мирные
    while (rolesArray.length < players.length) {
        rolesArray.push("Мирный житель");
    }

    // Перемешиваем роли
    rolesArray.sort(() => Math.random() - 0.5);

    // Раздаём игрокам
    players.forEach((player, index) => {
        player.role = rolesArray[index];

        // если игрок подключён к WS — отправляем роль
        if (player.ws) {
            player.ws.send(JSON.stringify({
                type: "role",
                role: player.role
            }));
        }
    });

    room.assigned = true;

    res.json({ success: true });
});


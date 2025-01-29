const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Разрешает соединение откуда угодно, можно ограничить
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

let players = {}; // Храним данные игроков

io.on("connection", (socket) => {
  console.log("Новое подключение:", socket.id);

  socket.on("playerJoin", (playerData) => {
    players[socket.id] = playerData;
    console.log("Игрок подключился:", playerData);

    io.emit("updatePlayers", Object.values(players)); // Рассылаем всем
  });

  socket.on("playerExit", () => {
    console.log("Игрок отключился:", players[socket.id]);
    delete players[socket.id];

    io.emit("updatePlayers", Object.values(players)); // Обновляем список
  });

  socket.on("disconnect", () => {
    console.log("Отключение:", socket.id);
    delete players[socket.id];
    io.emit("updatePlayers", Object.values(players));
  });
});

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

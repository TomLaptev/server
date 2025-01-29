const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const express = require("express");
const path = require("path");

const app = express();
const PORT = 4000;

// Читаем SSL-сертификат и ключ
const options = {
  key: fs.readFileSync(path.join(__dirname, "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "server.crt")),
};

// Создаём HTTPS-сервер
const server = https.createServer(options, app);

// Создаём WebSocket-сервер
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Новое WebSocket-соединение");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "playerExit") {
        console.log(`Игрок вышел: ${data.user?.id || "неизвестный"}`);
      } else {
        console.log("Получено сообщение:", data);
      }
    } catch (error) {
      console.warn("Ошибка обработки сообщения:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket-соединение закрыто");
  });
});

// Раздаём статику (если надо, можно убрать)
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Сервер работает по HTTPS!");
});

server.listen(PORT, () => {
  console.log(`Сервер запущен: https://localhost:${PORT}`);
});

//import { Server } from "socket.io";
//import express from "express";
//import http from "http";

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*", // Разрешает соединение откуда угодно, можно ограничить
		methods: ['GET', 'POST'],
	},
});

app.use((req, res, next) => {
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self' https://tictactoe-server.onrender.com; " +
			"script-src 'self' 'unsafe-inline' https://tictactoe-server.onrender.com; " +
			"connect-src 'self' https://tictactoe-server.onrender.com ws://localhost:3000 wss://localhost:3000;"
	);
	next();
});

const PORT = process.env.PORT || 3000;

let players = {}; // Храним данные игроков

io.on('connection', (socket) => {
	console.log('Новое подключение:', socket.id);

	socket.on('playerJoin', (playerData) => {
		players[socket.id] = playerData;
		console.log('Присоединился игрок:', playerData);

		io.emit('updatePlayers', Object.values(players)); // Рассылаем всем
	});

	socket.on('playerExit', () => {
		console.log('Игрок отключился:', players[socket.id]);
		delete players[socket.id];

		io.emit('updatePlayers', Object.values(players)); // Обновляем список
	});

	socket.on('disconnect', () => {
		console.log('Отключение:', socket.id);
		delete players[socket.id];
		io.emit('updatePlayers', Object.values(players));
	});

	// Получение списка игроков
	socket.on('requestPlayers', () => {
		io.to(socket.id).emit('updatePlayers', Object.values(players));

   // const playerList = getOnlinePlayers(); // Функция для получения списка игроков
   //io.emit('updatePlayersList', playerList);
	});

	// Отправка приглашения игроку
  socket.on('invitePlayer', ({ opponentId, user }) => {
    if (players[user]) {
        players[user].opponent = opponentId;
        players[user].available = false;
        //players[user].isYouX = store.isYouX;
    } else {
        console.error(`Игрок с ID ${user} не найден в списке игроков.`);
    }
});

	// if (players[opponentId]) {
	// 	io.to(opponentId).emit('receiveInvite', { opponentId: socket.id, roomId });
	// }
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');	
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});

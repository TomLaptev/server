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
		origin: '*', // Разрешает соединение откуда угодно, можно ограничить
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
let rooms = {}; // Создание объекта для хранения комнат

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
		io.emit('updatePlayers', Object.values(players));
		//io.to(socket.id).emit('updatePlayers', Object.values(players));

		// const playerList = getOnlinePlayers(); // Функция для получения списка игроков
		//io.emit('updatePlayersList', playerList);
	});

	// Создание комнаты
	socket.on('createRoom', (roomData) => {
		const roomId = roomData.id;
		socket.join(roomId); // Присоединяем создателя комнаты к ней
		console.log(`Комната ${roomId} создана игроком ${roomData.name}`);

		// Можно сохранить данные комнаты, если нужно
		rooms[roomId] = { ...roomData, players: [socket.id] };
	});

	// Отправка приглашения игроку
	socket.on('sendInvitePlayer', ({ roomId, opponentSocketId }) => {
		io.to(opponentSocketId).emit('roomInvitation', { roomId });
		console.log(
			`Приглашение отправлено игроку ${opponentSocketId} в комнату ${roomId}`
		);
	});

	// Присоединение к комнате
	socket.on('joinRoom', (roomId) => {
		socket.join(roomId);
		if (rooms[roomId]) {
			rooms[roomId].players.push(socket.id);
			console.log(`Игрок ${socket.id} присоединился к комнате ${roomId}`);

			// Уведомляем всех участников комнаты
			io.to(roomId).emit('roomUpdate', rooms[roomId]);
		}
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});

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

io.on('connection', (socket) => {
	socket.on('playerConnected', ({ yandexId }) => {
		socket.yandexId = yandexId; // Сохраняем yandexId в сокете
		players[yandexId] = { socketId: socket.id};
		console.log(`Игрок с ID ${yandexId} подключен.`);
	});

	socket.on('playerJoin', (playerData) => {
		const { yandexId } = playerData; // Извлекаем yandexId из playerData
		players[yandexId] = { ...playerData, socketId: socket.id };
		console.log('Присоединился игрок:', playerData);

		io.emit('updatePlayers', Object.values(players)); // Рассылаем всем
	});

	socket.on('playerExit', () => {
		const yandexId = socket.yandexId;
		if (yandexId && players[yandexId]) {
			console.log('Игрок отключился:', players[yandexId]);
			delete players[yandexId];
			io.emit('updatePlayers', Object.values(players));
		}
	});

	socket.on('disconnect', () => {
		const yandexId = socket.yandexId;
		if (yandexId && players[yandexId]) {
			console.log('Отключение:', yandexId);
			delete players[yandexId];
			io.emit('updatePlayers', Object.values(players));
		}
	});

	// Получение списка игроков
	socket.on('requestPlayers', () => {
		const yandexId = socket.yandexId;
		io.to(yandexId).emit('updatePlayers', Object.values(players));

		// const playerList = getOnlinePlayers(); // Функция для получения списка игроков
		//io.emit('updatePlayersList', playerList);
	});

	// Отправка приглашения игроку
	socket.on('invitePlayer', ({ opponentId, user }) => {
		
		if (players[user]) {
			players[user].opponent = opponentId;
		} else {
			console.error(`Игрок с ID ${user} не найден в списке игроков.`);
		}
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});

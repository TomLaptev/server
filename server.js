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

const PLAYER_TIMEOUT = 120000; // 2 минуты

function removeInactivePlayers() {
	const now = Date.now();
	// for (const id in players) {
	// 	console.log(`lastUpdate: ${players[id].lastActivity}`);
	// 	if (now - players[id].lastActivity > PLAYER_TIMEOUT) {
	// 		console.log(`Удаляю неактивного игрока: ${id}`);
	// 		delete players[id];
	// 	}
	// }
	// for (const id in rooms) {
	// 	if (now - rooms[id].lastActivity > PLAYER_TIMEOUT) {
	// 		console.log(`Удаляю неактивную комнату: ${id}`);
	// 		delete rooms[id];
	// 	}
	// }
	console.log(now);
	// io.emit("updatePlayers", Object.values(players));
}

// Запускаем очистку каждые 300 секунд
setInterval(removeInactivePlayers, 300000);

io.on('connection', (socket) => {
	console.log('Новое подключение:', socket.id);

	socket.on('playerJoin', (playerData) => {
		if (playerData.id && playerData.name && playerData.rating !== undefined) {
			if (!players[socket.id]) {
				players[socket.id] = playerData;
			}
		} else {
			console.warn('Неполные данные игрока:', playerData);
		}
		console.log('Присоединился игрок:', playerData);

		// Отправляем только корректные данные
		const validPlayers = Object.values(players).filter(
			(player) => player && player.id && player.name
		);
		console.log('Игроки для отправки:', Object.values(players));
		io.emit('updatePlayers', validPlayers);

		if (rooms) {
			console.log(12345);
			for (const id in rooms) {
				console.log('Застрявшая комната:', rooms[id]);
			}
		} else console.log('Застрявших комнат нет');
	});

	socket.on('playerExit', () => {
		console.log('Игрок отключился:', players[socket.id]);
		if (rooms[socket.id]) {
			io.to(roomId).emit('roomUpdate', rooms[roomId]);
			delete rooms[socket.id];
			console.log('Комната "', socket.id, ' "удалена');
		}
		delete players[socket.id];
		for (const id in players) {
			delete players[id];
		}

		console.log('Игрок "', socket.id, ' "удален');
		io.emit('updatePlayers', Object.values(players)); // Обновляем список
	});

	socket.on('disconnect', () => {
		console.log('Разъединение:', socket.id);
		if (rooms[socket.id]) {
			delete rooms[socket.id];
			io.to(roomId).emit('roomUpdate', rooms[roomId]);
			console.log('Комната "', socket.id, ' "удалена');
		}

		delete players[socket.id];

		console.log('Игрок "', socket.id, ' "удален');
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
		console.log(`Приватная комната ${roomId} создана игроком ${roomData.name}`);

		io.to(roomId).emit('roomUpdate', rooms[roomId]);

		// Можно сохранить данные комнаты, если нужно
		rooms[roomId] = { ...roomData, players: [socket.id] };
	});

	// Отправка приглашения игроку
	socket.on('sendInvitePlayer', ({ roomId, opponentSocketId }) => {
		io.to(opponentSocketId).emit('roomInvitation', { roomId });
		io.to(roomId).emit('roomUpdate', rooms[roomId]);
		console.log(
			`Приглашение отправлено игроку ${opponentSocketId} в комнату ${roomId}`
		);
	});

	socket.on('updatePlayersStatus', ({ id, opponentSocketId, available }) => {
		if (players[opponentSocketId]) {
			players[opponentSocketId].available = available;
		}
		if (players[id]) {
			players[id].available = available;
		}

		io.emit('updatePlayers', Object.values(players)); // Отправляем обновленный список
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

	// Обновление комнаты
	socket.on('refusalPlay', (roomId) => {
		if (rooms[socket.id]) {
			io.to(roomId).emit('roomDelete', rooms[socket.id]);
			delete rooms[socket.id];
			console.log('Приватная комната игрока-А удалена');
		}
		if (rooms[roomId]) {
			io.to(roomId).emit('roomDelete', rooms[roomId]);
			delete rooms[roomId];
			console.log('Приватная комната игрока-Б удалена');
		}
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});

const fs = require('fs');
const http = require('http');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {    
    origin: [
      'https://yandex.ru',
      'https://ya.ru',
      'https://yandex.com'
    ],
    methods: ['GET', 'POST']
  }
});

// Защита от зацикливания на сервере
io.on('connection', (socket) => {
  console.log(`Новое подключение: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Отключено: ${socket.id}, причина: ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`Ошибка на сокете ${socket.id}:`, err);
  });

  // Пример безопасного обработчика
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

app.use((req, res, next) => {
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self'; " +
		"script-src 'self' 'unsafe-inline'; " +
		`connect-src 'self' http://77.95.201.171 ws://77.95.201.171:3000;`
	);
  next();
});

//const PORT = process.env.PORT || 3000;
let players = {}; // Храним данные игроков
let rooms = {}; // Создание объекта для хранения комнат

io.on('connection', (socket) => {

	socket.on('playerJoin', (playerData) => {
		console.log(
			"'Зависшие' игроки:",
			Object.keys(players) // Список игроков
		);
		if (playerData.id && playerData.name && playerData.rating !== undefined) {
			if (!players[socket.id]) {
				players[socket.id] = playerData;
			}
		} else {
			console.warn('Неполные данные игрока:', playerData);
		}
		console.log('Присоединился игрок:', playerData.name, ': ', playerData.id);

		// Отправляем только корректные данные
		const validPlayers = Object.values(players).filter(
			(player) => player && player.id && player.name
		);
		console.log(
			'Игроки для отправки:',
			Object.values(players).map((player) => player.name)
		);
		io.to(socket.id).emit('dataSent', socket.id);
	});

	socket.on('playerExit', () => {
		console.log(`Игрок ${players[socket.id].name} вышел из игры`);

		// Проверяем, был ли игрок в комнате
		const roomId = Object.keys(rooms).find((id) =>
			rooms[id]?.players.includes(socket.id)
		);

		if (roomId) {
			console.log('Игрок был в комнате');
			const room = rooms[roomId];

			// Определяем второго игрока
			const opponentId = room.players.find((id) => id !== socket.id);

			if (opponentId) {
				//io.to(opponentId).emit('opponentExit', roomId);
				io.to(opponentId).emit('roomDelete', roomId);
				console.log(
					`Игрок ${opponentId} уведомлен о выходе игрока ${socket.id}`
				);
			}

			// Удаляем комнату
			delete rooms[roomId];
			console.log(`Приватная комната ${roomId} удалена`);
		}

		// Удаляем игрока из списка
		if (players[socket.id]) {
			 delete players[socket.id];

			io.emit('updatePlayers', Object.values(players));
			console.log('Контроль запроса на обновление');
		}
	});

	socket.on('disconnect', () => {
		console.log(`Игрок ${socket.id} отключился`);

		// Проверяем, был ли игрок в комнате
		const roomId = Object.keys(rooms).find((id) =>
			rooms[id]?.players.includes(socket.id)
		);

		if (roomId) {
			console.log('Игрок был в комнате');
			const room = rooms[roomId];

			// Определяем второго игрока
			const opponentId = room.players.find((id) => id !== socket.id);

			if (opponentId) {
				io.to(opponentId).emit('opponentDisconnected', roomId);
				console.log(
					`Игрок ${opponentId} уведомлен о разрыве соединения с ${socket.id}`
				);
			}

			// Удаляем комнату
			delete rooms[roomId];
			console.log(`Приватная комната ${roomId} удалена`);
		}

		// Удаляем игрока из списка
		if (players[socket.id]) {
			delete players[socket.id];
			console.log(`Игрок ${socket.id} удалён из списка игроков`);

			io.emit('updatePlayers', Object.values(players));
			console.log('Контроль запроса на обновление');
		}

		// for (const id in players) {
		// 	delete players[id];
		// }
	});

	// Получение списка игроков
	socket.on('requestPlayers', () => {
		io.emit('updatePlayers', Object.values(players));
	});

	// Создание комнаты
	socket.on('createRoom', (roomData) => {
		const roomId = roomData.userRoom; // Используем userRoom как ключ
		socket.join(roomId); // Присоединяем создателя комнаты к ней
		console.log(`Приватная комната ${roomId} создана игроком ${roomData.name}`);

		// Можно сохранить данные комнаты, если нужно
		rooms[roomId] = { ...roomData, players: [socket.id] };
	});

	// Отправка приглашения игроку
	socket.on('sendInvitePlayer', ({ roomId, opponentSocketId, name }) => {
		io.to(opponentSocketId).emit('roomInvitation', { roomId });
		console.log(`Приглашение отправлено игроку ${name} в комнату ${roomId}`);

		io.to(opponentSocketId).emit('roomUpdate', rooms[roomId]);
		console.log(
			`Отправление-1 на обновление комнаты оппоненту ${opponentSocketId}`
		);
	});

	socket.on('updatePlayersStatus', ({ id, opponentSocketId, available, rating }) => {
		if (players[opponentSocketId]) {
			players[opponentSocketId].available = available;
		}
		if (players[id]) {
			players[id].available = available;
			players[id].rating = rating;
		}
	});

	// Присоединение к комнате
	socket.on('joinRoom', (roomId) => {
		if (!rooms[roomId]) return;

		if (!rooms[roomId].players) {
			rooms[roomId].players = [];
		}
		rooms[roomId].players.push(socket.id);

		console.log(`Игрок ${socket.id} присоединился к комнате ${roomId}`);
		console.log('Список игроков в комнате:', rooms[roomId].players);
	});

	// Обмен данными в комнате
	socket.on('updatingRoomData', ({ roomId, opponentId, updatedData }) => {

		// Обновляем только переданные параметры, сохраняя остальные
		rooms[roomId] = { ...rooms[roomId], ...updatedData };

		// Отправляем обновление только оппоненту
		console.log(`opponentId: ${opponentId}`);
		io.to(opponentId).emit('roomUpdate', rooms[roomId]);

		console.log(`Обновление комнаты ${roomId} отправлено ${opponentId}`);
	});

	//Отказ от игры
	socket.on('refusalPlay', ({opponentId, roomId }) => {
		if (rooms[roomId]) {
			io.to(opponentId).emit('roomDelete', { roomId });

			console.log(`Приватная комната ${roomId} удалена`);
			delete rooms[roomId];

			console.log(
				"'Зависшие' комнаты:",
				Object.keys(rooms) // Теперь список покажет только актуальные комнаты
			);
		}
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen( 3000, () => {
	console.log(`Сервер запущен на порту 3000`);
});


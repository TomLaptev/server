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
	console.log(now);
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
		console.log('Игрок вышел из игры:', players[socket.id].name);
		if (rooms[socket.id]) {
			//io.to(roomId).emit('roomUpdate', rooms[roomId]);
			delete rooms[socket.id];
			console.log('Комната от игрока "', players[socket.id].name, ' "удалена');
		}
		console.log('Игрок "', players[socket.id].name, ' "удален');
		delete players[socket.id];

		io.emit('updatePlayers', Object.values(players)); // Обновляем список
		console.log(
			'В игре:',
			Object.values(players).map((player) => player.name)
		);
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
		console.log(`Отправление-1 на обновление комнаты оппоненту ${opponentSocketId}`);
	});

	socket.on('updatePlayersStatus', ({ id, opponentSocketId, available }) => {
		if (players[opponentSocketId]) {
			players[opponentSocketId].available = available;
		}
		if (players[id]) {
			players[id].available = available;
		}
	});

	// Присоединение к комнате
	socket.on('joinRoom', (roomId) => {
		if (!rooms[roomId]) return;

		if (!rooms[roomId].players) {
			rooms[roomId].players = [];
		}
		rooms[roomId].players.push(socket.id);

		//console.log(`Игрок ${players[socket.id]?.name} присоединился к комнате ${roomId}`);
		console.log(`Игрок ${socket.id} присоединился к комнате ${roomId}`);
		console.log('Список игроков в комнате:', rooms[roomId].players);
	});

	// Обмен данными в комнате
	socket.on('updatingRoomData', ({ roomId, opponentId, updatedData }) => {
		// if (!rooms[roomId]) return;

		// Обновляем только переданные параметры, сохраняя остальные
		rooms[roomId] = { ...rooms[roomId], ...updatedData };

		// Отправляем обновление только оппоненту
		io.to(opponentId).emit('roomUpdate', rooms[roomId]);

		console.log(`Обновление комнаты ${roomId} отправлено ${opponentId}`);
	});

	// Отказ от игры
	socket.on('refusalPlay', ({ roomId }) => {
		if (rooms[roomId]) {
			io.to(roomId).emit('roomDelete', { roomId });

			console.log(`Приватная комната ${roomId} игрока-Б, удалена`);
			delete rooms[roomId];
		} else if (rooms[socket.id]) {
			let roomId = socket.id;
			io.to(roomId).emit('roomDelete', { roomId });

			console.log(`Приватная комната ${roomId} игрока-А, удалена`);
			delete rooms[socket.id];
		}
		console.log(
			"'Зависшие' комнаты:",
			Object.values(rooms).map((room) => room.id)
		);
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});
this.backButton;

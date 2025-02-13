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
		//io.emit('updatePlayers', validPlayers);
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
		console.log('Разъединение:' /* ,  players[socket.id].name */);
		if (rooms[socket.id]) {
			//io.to(roomId).emit('roomUpdate', rooms[roomId]);
			delete rooms[socket.id];
			console.log('Комната от игрока "', players[socket.id].name, ' "удалена');
		}
		console.log(socket.id, ' "удален');
		delete players[socket.id];

		io.emit('updatePlayers', Object.values(players));
		console.log(
			'В игре:',
			Object.values(players).map((player) => player.name)
		);
	});

	// Получение списка игроков
	socket.on('requestPlayers', () => {
		io.emit('updatePlayers', Object.values(players));
	});

	// Создание комнаты
	socket.on('createRoom', (roomData) => {
		const roomId = roomData.id;
		socket.join(roomId); // Присоединяем создателя комнаты к ней
		console.log(`Приватная комната ${roomId} создана игроком ${roomData.name}`);

		//io.to(roomId).emit('roomUpdate', rooms[roomId]);

		// Можно сохранить данные комнаты, если нужно
		rooms[roomId] = { ...roomData, players: [socket.id] };
	});

	// Отправка приглашения игроку
	socket.on('sendInvitePlayer', ({ roomId, opponentSocketId, name }) => {
		io.to(opponentSocketId).emit('roomInvitation', { roomId });
		//io.to(roomId).emit('roomUpdate', rooms[roomId]);
		console.log(`Приглашение отправлено игроку ${name} в комнату ${roomId}`);
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
			console.log(
				`Игрок ${players[socket.id].name} присоединился к комнате ${roomId}`
			);

			// Уведомляем всех участников комнаты
			io.to(roomId).emit('roomUpdate', rooms[roomId]);
		}
	});

	// Обновление комнаты
	socket.on('refusalPlay', ({ roomId }) => {
		if (rooms[socket.id]) {
			io.to(socket.id).emit('roomDelete', rooms[socket.id]);
			delete rooms[socket.id];
			console.log(`Приватная комната ${socket.id} игрока-А удалена`);
		}
		if (rooms[roomId]) {
			io.to(roomId).emit('roomDelete', rooms[roomId]);
			delete rooms[roomId];
			console.log(`Приватная комната ${roomId} игрока-Б удалена`);
		}
		/*	}); 

	socket.on('refusalPlay', ({ opponent, roomId }) => {
		if (rooms[roomId]) {
			io.to(opponent).emit('roomDelete', roomId);
			delete rooms[roomId];
			console.log(`Приватная комната - ${roomId} удалена`);
		} else {
			console.log(`Ошибка: комната ${roomId} не найдена`);
		}*/

		console.log("'Зависшие' комнаты:", Object.values(rooms).map((room) => room.id));
	});
});

app.get('/', (req, res) => {
	res.send('Сервер работает!');
});
server.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`);
});
this.backButton;

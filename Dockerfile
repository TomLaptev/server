# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json перед установкой зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код внутрь контейнера
COPY . .

# Открываем порт (Render сам подставит свой)
EXPOSE 10000

# Запускаем сервер
CMD ["node", "./server.js"]

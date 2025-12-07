// Конфигурация
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://mafia-c6a2.onrender.com';

// Глобальные переменные
let socket = null;
let currentRoom = null;
let currentPlayer = null;
let isHost = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateServerStats();
    setInterval(updateServerStats, 30000); // Обновляем статистику каждые 30 секунд
    
    // Обработчики для кнопок выбора ролей
    initRoleSelection();
    
    // Проверяем наличие кода комнаты в URL
    checkUrlParams();
});

// Инициализация выбора ролей
function initRoleSelection() {
    // Обработчики для кнопок +/-
    document.querySelectorAll('.count-btn').forEach(button => {
        button.addEventListener('click', function() {
            const roleOption = this.closest('.role-option');
            const role = roleOption.dataset.role;
            const countElement = roleOption.querySelector('.count');
            let count = parseInt(countElement.textContent);
            
            if (this.classList.contains('plus')) {
                count++;
            } else if (this.classList.contains('minus') && count > 0) {
                count--;
            }
            
            countElement.textContent = count;
            updateRoleStats();
        });
    });
    
    // Обновляем статистику при изменении количества игроков
    document.getElementById('player-count').addEventListener('change', updateRoleStats);
}

// Обновление статистики ролей
function updateRoleStats() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    let selectedRoles = 0;
    
    // Считаем выбранные роли
    document.querySelectorAll('.role-option').forEach(option => {
        const count = parseInt(option.querySelector('.count').textContent);
        selectedRoles += count;
    });
    
    // Обновляем отображение
    document.getElementById('selected-roles-count').textContent = selectedRoles;
    document.getElementById('required-roles-count').textContent = playerCount;
    
    const balanceElement = document.getElementById('role-balance');
    if (selectedRoles === playerCount) {
        balanceElement.textContent = '✓ Сбалансировано';
        balanceElement.className = 'balanced';
    } else if (selectedRoles < playerCount) {
        balanceElement.textContent = `Не хватает ${playerCount - selectedRoles} ролей`;
        balanceElement.className = 'unbalanced';
    } else {
        balanceElement.textContent = `Лишних ${selectedRoles - playerCount} ролей`;
        balanceElement.className = 'unbalanced';
    }
}

// Показать главный экран
function showMainScreen() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById('screen-main').style.display = 'block';
}

// Показать экран создания комнаты
function showCreateRoom() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById('screen-create').style.display = 'block';
    
    // Сбросить значения по умолчанию
    document.getElementById('host-name').value = '';
    document.getElementById('room-name').value = '';
    document.getElementById('player-count').value = '8';
    
    // Сбросить роли к значениям по умолчанию
    document.querySelectorAll('.role-option').forEach(option => {
        const role = option.dataset.role;
        let defaultCount = 0;
        
        switch(role) {
            case 'mafia': defaultCount = 2; break;
            case 'civilian': defaultCount = 4; break;
            case 'sheriff': defaultCount = 1; break;
            case 'don': defaultCount = 0; break;
            case 'doctor': defaultCount = 1; break;
        }
        
        option.querySelector('.count').textContent = defaultCount;
    });
    
    updateRoleStats();
}

// Показать экран присоединения
function showJoinRoom() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById('screen-join').style.display = 'block';
    
    // Сбросить значения
    document.getElementById('player-name').value = '';
    document.getElementById('room-code').value = '';
}

// Создание комнаты
function createRoom() {
    const hostName = document.getElementById('host-name').value.trim();
    const roomName = document.getElementById('room-name').value.trim();
    const playerCount = parseInt(document.getElementById('player-count').value);
    
    // Валидация
    if (!hostName) {
        showNotification('Введите ваше имя', 'error');
        return;
    }
    
    if (!roomName) {
        showNotification('Введите название комнаты', 'error');
        return;
    }
    
    if (hostName.length < 2 || hostName.length > 20) {
        showNotification('Имя должно быть от 2 до 20 символов', 'error');
        return;
    }
    
    // Собираем выбранные роли
    const selectedRoles = [];
    document.querySelectorAll('.role-option').forEach(option => {
        const role = option.dataset.role;
        const count = parseInt(option.querySelector('.count').textContent);
        
        for (let i = 0; i < count; i++) {
            selectedRoles.push(role);
        }
    });
    
    // Проверяем баланс ролей
    if (selectedRoles.length !== playerCount) {
        showNotification(`Количество ролей (${selectedRoles.length}) должно совпадать с количеством игроков (${playerCount})`, 'error');
        return;
    }
    
    // Подключаемся к серверу через Socket.io
    connectToServer();
    
    // Отправляем запрос на создание комнаты
    socket.emit('create-room', {
        roomName: roomName,
        playerCount: playerCount,
        roles: selectedRoles,
        playerName: hostName
    });
}

// Присоединение к комнате
function joinRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    // Валидация
    if (!playerName) {
        showNotification('Введите ваше имя', 'error');
        return;
    }
    
    if (!roomCode) {
        showNotification('Введите код комнаты', 'error');
        return;
    }
    
    if (playerName.length < 2 || playerName.length > 20) {
        showNotification('Имя должно быть от 2 до 20 символов', 'error');
        return;
    }
    
    if (roomCode.length !== 6) {
        showNotification('Код комнаты должен состоять из 6 символов', 'error');
        return;
    }
    
    // Подключаемся к серверу
    connectToServer();
    
    // Отправляем запрос на присоединение
    socket.emit('join-room', {
        roomId: roomCode,
        playerName: playerName
    });
}

// Подключение к серверу через Socket.io
function connectToServer() {
    if (socket && socket.connected) {
        return;
    }
    
    // Устанавливаем соединение
    socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    // Обработчики событий Socket.io
    socket.on('connect', () => {
        console.log('Подключено к серверу');
        document.getElementById('server-status').className = 'status-online';
        document.getElementById('server-status').textContent = '● Онлайн';
    });
    
    socket.on('disconnect', () => {
        console.log('Отключено от сервера');
        document.getElementById('server-status').className = 'status-offline';
        document.getElementById('server-status').textContent = '● Офлайн';
    });
    
    socket.on('connect_error', (error) => {
        console.error('Ошибка подключения:', error);
        showNotification('Не удалось подключиться к серверу', 'error');
    });
    
    // Обработчики игровых событий
    socket.on('room-created', (roomInfo) => {
        handleRoomCreated(roomInfo);
    });
    
    socket.on('room-joined', (roomInfo) => {
        handleRoomJoined(roomInfo);
    });
    
    socket.on('join-error', (data) => {
        showNotification(data.message || 'Не удалось присоединиться к комнате', 'error');
    });
    
    socket.on('player-joined', (data) => {
        updatePlayersList(data.players);
    });
    
    socket.on('player-disconnected', (data) => {
        updatePlayersList(data.players);
    });
    
    socket.on('roles-shuffled', (roomInfo) => {
        handleRolesShuffled(roomInfo);
    });
    
    socket.on('roles-revealed', (roomInfo) => {
        handleRolesRevealed(roomInfo);
    });
    
    socket.on('game-started', () => {
        showNotification('Игра началась! Роли разданы игрокам.', 'success');
    });
    
    socket.on('new-host', (data) => {
        if (currentPlayer && currentPlayer.id === data.hostId) {
            isHost = true;
            showNotification('Вы стали ведущим!', 'success');
        }
    });
    
    // Пинг для поддержания соединения
    setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('ping');
        }
    }, 30000);
}

// Обработка создания комнаты
function handleRoomCreated(roomInfo) {
    currentRoom = roomInfo;
    currentPlayer = {
        name: document.getElementById('host-name').value.trim(),
        isHost: true
    };
    isHost = true;
    
    showHostGameScreen(roomInfo);
}

// Обработка присоединения к комнате
function handleRoomJoined(roomInfo) {
    currentRoom = roomInfo;
    currentPlayer = {
        name: document.getElementById('player-name').value.trim(),
        isHost: roomInfo.isHost
    };
    isHost = roomInfo.isHost;
    
    if (isHost) {
        showHostGameScreen(roomInfo);
    } else {
        showPlayerGameScreen(roomInfo);
    }
}

// Показать экран игры для ведущего
function showHostGameScreen(roomInfo) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    document.getElementById('screen-game-host').style.display = 'block';
    
    // Заполняем информацию о комнате
    document.getElementById('game-room-name').textContent = roomInfo.roomName;
    document.getElementById('game-room-code').textContent = roomInfo.roomId;
    document.getElementById('current-players').textContent = roomInfo.players.length;
    document.getElementById('max-players').textContent = roomInfo.playerCount;
    
    // Генерируем ссылку для приглашения
    const inviteLink = `${window.location.origin}?room=${roomInfo.roomId}`;
    document.getElementById('invite-link').textContent = inviteLink;
    
    // Обновляем список игроков
    updatePlayersList(roomInfo.players);
    
    // Активируем/деактивируем кнопки
    const shuffleBtn = document.getElementById('shuffle-btn');
    const revealBtn = document.getElementById('reveal-btn');
    
    if (roomInfo.players.length >= roomInfo.playerCount) {
        shuffleBtn.disabled = false;
        shuffleBtn.title = '';
    } else {
        shuffleBtn.disabled = true;
        shuffleBtn.title = `Ждем еще ${roomInfo.playerCount - roomInfo.players.length} игроков`;
    }
    
    revealBtn.disabled = !roomInfo.gameStarted;
}

// Показать экран игры для игрока
function showPlayerGameScreen(roomInfo) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    document.getElementById('screen-game-player').style.display = 'block';
    
    // Заполняем информацию о комнате
    document.getElementById('player-room-name').textContent = roomInfo.roomName;
    document.getElementById('player-room-code').textContent = roomInfo.roomId;
    document.getElementById('player-current-players').textContent = roomInfo.players.length;
    document.getElementById('player-max-players').textContent = roomInfo.playerCount;
    
    // Заполняем информацию об игроке
    document.getElementById('display-player-name').textContent = currentPlayer.name;
    
    // Обновляем роль игрока
    updatePlayerRole(roomInfo.playerRole, roomInfo.revealed);
    
    // Обновляем список игроков
    updatePlayersList(roomInfo.players);
}

// Обновление списка игроков
function updatePlayersList(players) {
    // Для ведущего
    const hostList = document.getElementById('players-list-host');
    const playerList = document.getElementById('players-list-player');
    
    if (hostList) {
        updatePlayersListElement(hostList, players, true);
    }
    
    if (playerList) {
        updatePlayersListElement(playerList, players, false);
    }
    
    // Обновляем счетчики игроков
    if (currentRoom) {
        document.getElementById('current-players').textContent = players.length;
        document.getElementById('player-current-players').textContent = players.length;
        
        // Обновляем состояние кнопки "Раздать роли"
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            if (players.length >= currentRoom.playerCount) {
                shuffleBtn.disabled = false;
                shuffleBtn.title = '';
            } else {
                shuffleBtn.disabled = true;
                shuffleBtn.title = `Ждем еще ${currentRoom.playerCount - players.length} игроков`;
            }
        }
    }
}

// Обновление элемента списка игроков
function updatePlayersListElement(element, players, showRoles) {
    element.innerHTML = '';
    
    if (players.length === 0) {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-clock"></i>
                <p>Ожидание игроков...</p>
            </div>
        `;
        return;
    }
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        // Определяем роль для отображения
        let roleDisplay = '';
        if (showRoles || currentRoom.revealed || player.id === currentPlayer?.id) {
            if (player.role) {
                const roleName = getRoleName(player.role);
                const roleColor = getRoleColor(player.role);
                roleDisplay = `<div class="player-role" style="color: ${roleColor}">${roleName}</div>`;
            } else {
                roleDisplay = '<div class="player-role">ожидание...</div>';
            }
        } else {
            roleDisplay = '<div class="player-role">скрыта</div>';
        }
        
        // Определяем аватар
        const avatarIcon = player.isHost ? 'fas fa-crown' : 'fas fa-user';
        const avatarColor = player.isHost ? '#ffc107' : '#ff6b6b';
        
        playerCard.innerHTML = `
            <div class="player-avatar" style="background: ${avatarColor}">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="player-details">
                <div class="player-name">
                    ${player.name}
                    ${player.isHost ? '<span class="player-host-badge">Ведущий</span>' : ''}
                    ${player.id === currentPlayer?.id ? '<span class="player-host-badge">Вы</span>' : ''}
                </div>
                ${roleDisplay}
            </div>
        `;
        
        element.appendChild(playerCard);
    });
}

// Обновление роли игрока
function updatePlayerRole(role, revealed) {
    const roleDisplay = document.getElementById('player-role-display');
    
    if (!role || (!revealed && !isHost)) {
        roleDisplay.textContent = 'ожидание...';
        roleDisplay.style.color = '';
        return;
    }
    
    const roleName = getRoleName(role);
    const roleColor = getRoleColor(role);
    
    roleDisplay.textContent = roleName;
    roleDisplay.style.color = roleColor;
}

// Получение названия роли
function getRoleName(roleId) {
    const roleNames = {
        'mafia': 'Мафия',
        'civilian': 'Мирный житель',
        'sheriff': 'Шериф',
        'don': 'Дон мафии',
        'doctor': 'Доктор',
        'maniac': 'Маньяк',
        'courtesan': 'Куртизанка'
    };
    
    return roleNames[roleId] || roleId;
}

// Получение цвета роли
function getRoleColor(roleId) {
    const roleColors = {
        'mafia': '#e94560',
        'civilian': '#8ac6d1',
        'sheriff': '#4cc9f0',
        'don': '#b30000',
        'doctor': '#6fffb0',
        'maniac': '#ff9a00',
        'courtesan': '#ff6bcb'
    };
    
    return roleColors[roleId] || '#ffffff';
}

// Перемешивание ролей
function shuffleRoles() {
    if (!socket || !socket.connected) {
        showNotification('Нет соединения с сервером', 'error');
        return;
    }
    
    if (!isHost) {
        showNotification('Только ведущий может раздавать роли', 'error');
        return;
    }
    
    socket.emit('shuffle-roles');
}

// Раскрытие ролей
function revealRoles() {
    if (!socket || !socket.connected) {
        showNotification('Нет соединения с сервером', 'error');
        return;
    }
    
    if (!isHost) {
        showNotification('Только ведущий может показывать роли', 'error');
        return;
    }
    
    socket.emit('reveal-roles');
}

// Обработка перемешивания ролей
function handleRolesShuffled(roomInfo) {
    currentRoom = roomInfo;
    updatePlayersList(roomInfo.players);
    
    // Обновляем кнопки
    document.getElementById('reveal-btn').disabled = false;
    
    // Для игроков обновляем их роль
    if (!isHost) {
        updatePlayerRole(roomInfo.playerRole, roomInfo.revealed);
    }
}

// Обработка раскрытия ролей
function handleRolesRevealed(roomInfo) {
    currentRoom = roomInfo;
    updatePlayersList(roomInfo.players);
    
    // Для игроков обновляем их роль
    if (!isHost) {
        updatePlayerRole(roomInfo.playerRole, roomInfo.revealed);
    }
}

// Копирование ссылки для приглашения
function copyInviteLink() {
    const inviteLink = document.getElementById('invite-link').textContent;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
        showNotification('Ссылка скопирована в буфер обмена!', 'success');
    }).catch(err => {
        showNotification('Не удалось скопировать ссылку', 'error');
        console.error('Ошибка копирования:', err);
    });
}

// Выход из комнаты
function leaveRoom() {
    if (socket) {
        socket.disconnect();
    }
    
    currentRoom = null;
    currentPlayer = null;
    isHost = false;
    
    showMainScreen();
    showNotification('Вы вышли из комнаты', 'info');
}

// Показать уведомление
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Автоматически скрываем уведомление через 5 секунд
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Обновление статистики сервера
async function updateServerStats() {
    try {
        const response = await fetch(`${SERVER_URL}/api/stats`);
        const data = await response.json();
        
        document.getElementById('room-count').textContent = data.totalRooms;
        document.getElementById('player-count').textContent = data.totalPlayers;
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
    }
}

// Проверка параметров URL
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode && roomCode.length === 6) {
        document.getElementById('room-code').value = roomCode.toUpperCase();
        showJoinRoom();
    }
}
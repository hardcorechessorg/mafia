// Конфигурация
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;

// Глобальные переменные
let socket = null;
let currentRoom = null;
let currentPlayer = null;
let isHost = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateServerStats();
    setInterval(updateServerStats, 30000);
    
    // Инициализируем выбор ролей
    initRoleSelection();
    
    // Проверяем наличие кода комнаты в URL
    checkUrlParams();
    
    // Инициализируем отображение
    updateRequiredRolesDisplay();
});

// Инициализация выбора ролей
function initRoleSelection() {
    // Обработчики для кнопок +/-
    document.querySelectorAll('.count-btn').forEach(button => {
        button.addEventListener('click', function() {
            const roleOption = this.closest('.role-option');
            const countElement = roleOption.querySelector('.count');
            let count = parseInt(countElement.textContent);
            
            if (this.classList.contains('plus')) {
                count++;
            } else if (this.classList.contains('minus') && count > 0) {
                count--;
            }
            
            countElement.textContent = count;
            checkRoleBalance();
        });
    });
    
    // Обновляем при изменении количества игроков
    const playerCountSelect = document.getElementById('player-count');
    if (playerCountSelect) {
        playerCountSelect.addEventListener('change', function() {
            const playerCount = parseInt(this.value);
            console.log('Количество игроков изменено на:', playerCount);
            
            // Обновляем отображение "Необходимо"
            updateRequiredRolesDisplay();
            
            // Устанавливаем роли по умолчанию
            setDefaultRoles(playerCount);
            
            // Проверяем баланс
            checkRoleBalance();
        });
    }
}

// Обновление отображения "Необходимо"
function updateRequiredRolesDisplay() {
    const playerCountSelect = document.getElementById('player-count');
    const requiredCountElement = document.getElementById('required-roles-count');
    
    if (playerCountSelect && requiredCountElement) {
        const playerCount = parseInt(playerCountSelect.value);
        requiredCountElement.textContent = playerCount;
        console.log('"Необходимо" обновлено на:', playerCount);
    }
}

// Установка ролей по умолчанию
function setDefaultRoles(playerCount) {
    const rolesConfig = {
        6: { mafia: 1, civilian: 4, sheriff: 1, doctor: 0, don: 0, maniac: 0, courtesan: 0 },
        7: { mafia: 2, civilian: 4, sheriff: 1, doctor: 0, don: 0, maniac: 0, courtesan: 0 },
        8: { mafia: 2, civilian: 4, sheriff: 1, doctor: 1, don: 0, maniac: 0, courtesan: 0 },
        9: { mafia: 2, civilian: 5, sheriff: 1, doctor: 1, don: 0, maniac: 0, courtesan: 0 },
        10: { mafia: 3, civilian: 5, sheriff: 1, doctor: 1, don: 0, maniac: 0, courtesan: 0 },
        11: { mafia: 3, civilian: 6, sheriff: 1, doctor: 1, don: 0, maniac: 0, courtesan: 0 },
        12: { mafia: 4, civilian: 6, sheriff: 1, doctor: 1, don: 0, maniac: 0, courtesan: 0 }
    };
    
    const config = rolesConfig[playerCount] || rolesConfig[8];
    
    console.log(`Установка ролей для ${playerCount} игроков:`, config);
    
    // Устанавливаем значения для каждой роли
    ['mafia', 'civilian', 'sheriff', 'doctor', 'don', 'maniac', 'courtesan'].forEach(role => {
        const option = document.querySelector(`.role-option[data-role="${role}"]`);
        if (option) {
            const count = config[role] || 0;
            option.querySelector('.count').textContent = count;
        }
    });
    
    checkRoleBalance();
}

// Проверка баланса ролей
function checkRoleBalance() {
    const playerCountElement = document.getElementById('player-count');
    const playerCount = playerCountElement ? parseInt(playerCountElement.value) : 8;
    
    let selectedRoles = 0;
    
    // Считаем выбранные роли
    document.querySelectorAll('.role-option').forEach(option => {
        const count = parseInt(option.querySelector('.count').textContent);
        selectedRoles += count;
    });
    
    // Обновляем "Выбрано ролей"
    const selectedCountElement = document.getElementById('selected-roles-count');
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedRoles;
    }
    
    const balanceElement = document.getElementById('role-balance');
    const createButton = document.getElementById('create-room-btn');
    
    if (!balanceElement) return;
    
    if (selectedRoles === playerCount) {
        balanceElement.textContent = '✓ Сбалансировано';
        balanceElement.className = 'balanced';
        if (createButton) createButton.disabled = false;
    } else if (selectedRoles < playerCount) {
        balanceElement.textContent = `Не хватает ${playerCount - selectedRoles} ролей`;
        balanceElement.className = 'unbalanced';
        if (createButton) createButton.disabled = true;
    } else {
        balanceElement.textContent = `Лишних ${selectedRoles - playerCount} ролей`;
        balanceElement.className = 'unbalanced';
        if (createButton) createButton.disabled = true;
    }
}

// Автобалансировка
function autoBalanceRoles() {
    const playerCountElement = document.getElementById('player-count');
    const playerCount = playerCountElement ? parseInt(playerCountElement.value) : 8;
    
    let selectedRoles = 0;
    
    document.querySelectorAll('.role-option').forEach(option => {
        const count = parseInt(option.querySelector('.count').textContent);
        selectedRoles += count;
    });
    
    if (selectedRoles < playerCount) {
        const civilianOption = document.querySelector('.role-option[data-role="civilian"]');
        if (civilianOption) {
            const civilianCount = civilianOption.querySelector('.count');
            let currentCivilian = parseInt(civilianCount.textContent);
            civilianCount.textContent = currentCivilian + (playerCount - selectedRoles);
        }
    } else if (selectedRoles > playerCount) {
        const civilianOption = document.querySelector('.role-option[data-role="civilian"]');
        if (civilianOption) {
            const civilianCount = civilianOption.querySelector('.count');
            let currentCivilian = parseInt(civilianCount.textContent);
            const newCount = Math.max(0, currentCivilian - (selectedRoles - playerCount));
            civilianCount.textContent = newCount;
        }
    }
    
    checkRoleBalance();
}

// Показать экран создания комнаты
function showCreateRoom() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById('screen-create').style.display = 'block';
    
    // Сбросить значения
    document.getElementById('host-name').value = '';
    document.getElementById('room-name').value = '';
    document.getElementById('player-count').value = '8';
    
    // Установить роли по умолчанию
    setDefaultRoles(8);
    updateRequiredRolesDisplay();
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
    
    console.log('Создаем комнату с:', {
        roomName,
        playerCount,
        selectedRoles,
        selectedRolesCount: selectedRoles.length
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
        console.log('Комната создана:', roomInfo);
        handleRoomCreated(roomInfo);
    });
    
    socket.on('room-joined', (roomInfo) => {
        console.log('Присоединились к комнате:', roomInfo);
        handleRoomJoined(roomInfo);
    });
    
    socket.on('join-error', (data) => {
        showNotification(data.message || 'Не удалось присоединиться к комнате', 'error');
    });
    
    socket.on('player-joined', (data) => {
        console.log('Новый игрок присоединился:', data);
        updatePlayersList(data.players);
    });
    
    socket.on('player-disconnected', (data) => {
        console.log('Игрок отключился:', data);
        updatePlayersList(data.players);
    });
    
    socket.on('roles-shuffled', (roomInfo) => {
        console.log('Роли перемешаны:', roomInfo);
        handleRolesShuffled(roomInfo);
    });
    
    socket.on('roles-revealed', (roomInfo) => {
        console.log('Роли раскрыты:', roomInfo);
        handleRolesRevealed(roomInfo);
    });
    
    socket.on('game-started', () => {
        showNotification('Игра началась! Роли разданы игрокам.', 'success');
    });
    
    socket.on('new-host', (data) => {
        console.log('Новый ведущий:', data);
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
    
    console.log('Ведущий создал комнату:', currentRoom);
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
    
    console.log('Игрок присоединился:', currentPlayer, 'Комната:', currentRoom);
    
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
    console.log('Обновление списка игроков:', players);
    
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
        const currentPlayersElement = document.getElementById('current-players');
        const playerCurrentPlayersElement = document.getElementById('player-current-players');
        
        if (currentPlayersElement) {
            currentPlayersElement.textContent = players.length;
        }
        
        if (playerCurrentPlayersElement) {
            playerCurrentPlayersElement.textContent = players.length;
        }
        
        // Обновляем состояние кнопки "Раздать роли"
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            if (players.length >= currentRoom.playerCount) {
                shuffleBtn.disabled = false;
                shuffleBtn.title = '';
                console.log('Кнопка "Раздать роли" активирована');
            } else {
                shuffleBtn.disabled = true;
                shuffleBtn.title = `Ждем еще ${currentRoom.playerCount - players.length} игроков`;
                console.log(`Ждем еще ${currentRoom.playerCount - players.length} игроков`);
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
        if (showRoles || (currentRoom && currentRoom.revealed) || (currentPlayer && player.id === currentPlayer.id)) {
            if (player.role) {
                const roleName = getRoleName(player.role);
                const roleColor = getRoleColor(player.role);
                roleDisplay = `<div class="player-role" style="color: ${roleColor}">${roleName}</div>`;
                console.log(`Показываем роль для ${player.name}: ${roleName}`);
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
                    ${currentPlayer && player.id === currentPlayer.id ? '<span class="player-host-badge">Вы</span>' : ''}
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
    
    if (!roleDisplay) return;
    
    if (!role || (!revealed && !isHost)) {
        roleDisplay.textContent = 'ожидание...';
        roleDisplay.style.color = '';
        console.log('Роль игрока: ожидание...');
        return;
    }
    
    const roleName = getRoleName(role);
    const roleColor = getRoleColor(role);
    
    roleDisplay.textContent = roleName;
    roleDisplay.style.color = roleColor;
    console.log(`Роль игрока установлена: ${roleName}`);
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
    
    console.log('Запрос на перемешивание ролей');
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
    
    console.log('Запрос на раскрытие ролей');
    socket.emit('reveal-roles');
}

// Обработка перемешивания ролей
function handleRolesShuffled(roomInfo) {
    console.log('Обработка перемешанных ролей:', roomInfo);
    currentRoom = roomInfo;
    updatePlayersList(roomInfo.players);
    
    // Обновляем кнопки
    const revealBtn = document.getElementById('reveal-btn');
    if (revealBtn) {
        revealBtn.disabled = false;
    }
    
    // Для игроков обновляем их роль
    if (!isHost) {
        updatePlayerRole(roomInfo.playerRole, roomInfo.revealed);
    }
}

// Обработка раскрытия ролей
function handleRolesRevealed(roomInfo) {
    console.log('Обработка раскрытых ролей:', roomInfo);
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
    console.log('Выход из комнаты');
    
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
    
    if (!notification) {
        console.log('Уведомление:', message, type);
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
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
        
        const roomCountElement = document.getElementById('room-count');
        const playerCountElement = document.getElementById('player-count');
        
        if (roomCountElement) {
            roomCountElement.textContent = data.totalRooms;
        }
        
        if (playerCountElement) {
            playerCountElement.textContent = data.totalPlayers;
        }
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
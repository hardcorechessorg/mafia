const socket = io();
let currentRoom = null;
let isHost = false;
let myRole = null;

const ROLES = {
    mafia: { name: 'Мафия', className: 'role-mafia' },
    civilian: { name: 'Мирный житель', className: 'role-civilian' },
    sheriff: { name: 'Шериф', className: 'role-sheriff' },
    doctor: { name: 'Доктор', className: 'role-doctor' },
    don: { name: 'Дон мафии', className: 'role-don' }
};

// Настройки ролей по умолчанию
const DEFAULT_ROLES = {
    6: { mafia: 1, civilian: 4, sheriff: 1, doctor: 0, don: 0 },
    7: { mafia: 2, civilian: 4, sheriff: 1, doctor: 0, don: 0 },
    8: { mafia: 2, civilian: 4, sheriff: 1, doctor: 1, don: 0 },
    9: { mafia: 2, civilian: 5, sheriff: 1, doctor: 1, don: 0 },
    10: { mafia: 3, civilian: 5, sheriff: 1, doctor: 1, don: 0 }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initRoleSelection();
});

// Управление экранами
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function showMainScreen() {
    showScreen('main-screen');
    currentRoom = null;
    isHost = false;
    myRole = null;
}

function showCreateScreen() {
    showScreen('create-screen');
    updateRoleSelection();
}

function showJoinScreen() {
    showScreen('join-screen');
}

function showGameScreen() {
    showScreen('game-screen');
}

// Инициализация выбора ролей
function initRoleSelection() {
    const container = document.getElementById('role-selection');
    container.innerHTML = '';
    
    Object.entries(ROLES).forEach(([id, role]) => {
        const div = document.createElement('div');
        div.className = 'role-option';
        div.innerHTML = `
            <div><strong>${role.name}</strong></div>
            <div class="counter">
                <button onclick="changeRoleCount('${id}', -1)">-</button>
                <span id="count-${id}">0</span>
                <button onclick="changeRoleCount('${id}', 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Обновление выбора ролей при изменении количества игроков
function updateRoleSelection() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    const defaultRoles = DEFAULT_ROLES[playerCount] || DEFAULT_ROLES[8];
    
    Object.entries(defaultRoles).forEach(([role, count]) => {
        document.getElementById(`count-${role}`).textContent = count;
    });
    
    document.getElementById('total-count').textContent = playerCount;
    updateSelectedCount();
    
    // Обновляем при изменении количества игроков
    document.getElementById('player-count').onchange = updateRoleSelection;
}

// Изменение количества ролей
function changeRoleCount(roleId, delta) {
    const span = document.getElementById(`count-${roleId}`);
    let count = parseInt(span.textContent) + delta;
    if (count < 0) count = 0;
    span.textContent = count;
    
    updateSelectedCount();
}

// Обновление счетчика выбранных ролей
function updateSelectedCount() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    let total = 0;
    
    Object.keys(ROLES).forEach(roleId => {
        total += parseInt(document.getElementById(`count-${roleId}`).textContent);
    });
    
    document.getElementById('selected-count').textContent = total;
    document.getElementById('total-count').textContent = playerCount;
    
    // Подсвечиваем если не совпадает
    const selectedSpan = document.getElementById('selected-count');
    selectedSpan.style.color = total === playerCount ? 'green' : 'red';
}

// Автобалансировка ролей
function autoBalance() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    let currentTotal = 0;
    
    // Считаем текущие роли
    Object.keys(ROLES).forEach(roleId => {
        currentTotal += parseInt(document.getElementById(`count-${roleId}`).textContent);
    });
    
    // Корректируем мирных жителей
    const civilianCount = parseInt(document.getElementById('count-civilian').textContent);
    const newCivilianCount = Math.max(0, civilianCount + (playerCount - currentTotal));
    document.getElementById('count-civilian').textContent = newCivilianCount;
    
    updateSelectedCount();
}

// Создание комнаты
function createRoom() {
    const hostName = document.getElementById('host-name').value.trim();
    const playerCount = parseInt(document.getElementById('player-count').value);
    
    if (!hostName) {
        alert('Введите ваше имя');
        return;
    }
    
    // Собираем роли
    const roles = [];
    Object.keys(ROLES).forEach(roleId => {
        const count = parseInt(document.getElementById(`count-${roleId}`).textContent);
        for (let i = 0; i < count; i++) {
            roles.push(roleId);
        }
    });
    
    // Проверяем баланс
    if (roles.length !== playerCount) {
        alert(`Выбрано ${roles.length} ролей, нужно ${playerCount}`);
        return;
    }
    
    socket.emit('create-room', {
        playerName: hostName,
        playerCount: playerCount,
        roles: roles
    });
}

// Присоединение к комнате
function joinRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!playerName) {
        alert('Введите ваше имя');
        return;
    }
    
    if (!roomCode || roomCode.length !== 4) {
        alert('Введите код комнаты (4 символа)');
        return;
    }
    
    socket.emit('join-room', {
        roomCode: roomCode,
        playerName: playerName
    });
}

// Раздача ролей
function dealRoles() {
    socket.emit('deal-roles');
}

// Показать роли всем
function revealRoles() {
    socket.emit('reveal-roles');
}

// Выйти из комнаты
function leaveRoom() {
    socket.disconnect();
    socket.connect();
    showMainScreen();
    showMessage('Вы вышли из комнаты', 'success');
}

// Показать сообщение
function showMessage(text, type) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    
    if (type === 'error') {
        errorDiv.textContent = text;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    } else {
        successDiv.textContent = text;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        
        setTimeout(() => {
            successDiv.classList.add('hidden');
        }, 5000);
    }
}

// Обновление списка игроков
function updatePlayersList(players) {
    const container = document.getElementById('players-list');
    container.innerHTML = '';
    
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name + (player.isHost ? ' 👑' : '');
        
        const roleSpan = document.createElement('span');
        
        if (player.role) {
            const roleInfo = ROLES[player.role];
            roleSpan.textContent = roleInfo.name;
            roleSpan.className = `role ${roleInfo.className}`;
        } else {
            roleSpan.textContent = 'ожидает...';
        }
        
        div.appendChild(nameSpan);
        div.appendChild(roleSpan);
        container.appendChild(div);
    });
    
    // Обновляем кнопки для ведущего
    const dealBtn = document.getElementById('deal-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const hostControls = document.getElementById('host-controls');
    
    if (isHost) {
        hostControls.classList.remove('hidden');
        dealBtn.disabled = players.length !== currentRoom.playerCount;
        dealBtn.textContent = players.length === currentRoom.playerCount 
            ? 'Раздать роли' 
            : `Ждем еще ${currentRoom.playerCount - players.length} игроков`;
    } else {
        hostControls.classList.add('hidden');
    }
}

// Обработчики Socket.io
socket.on('connect', () => {
    console.log('Подключено к серверу');
});

socket.on('room-created', (data) => {
    currentRoom = { code: data.roomCode, players: data.players };
    isHost = true;
    
    document.getElementById('room-name-display').textContent = 'Ведущий';
    document.getElementById('room-code-display').textContent = `Код комнаты: ${data.roomCode}`;
    
    showGameScreen();
    updatePlayersList(data.players);
    showMessage('Комната создана! Отправьте код игрокам', 'success');
});

socket.on('player-joined', (data) => {
    if (currentRoom) {
        currentRoom.players = data.players;
        updatePlayersList(data.players);
        showMessage('Новый игрок присоединился', 'success');
    }
});

socket.on('player-left', (data) => {
    if (currentRoom) {
        currentRoom.players = data.players;
        updatePlayersList(data.players);
    }
});

socket.on('new-host', (data) => {
    showMessage(`${data.hostName} теперь ведущий`, 'success');
    isHost = socket.id === data.hostName;
});

socket.on('role-assigned', (data) => {
    myRole = data.role;
    
    // Показываем свою роль
    const roleInfo = ROLES[myRole];
    document.getElementById('your-role').textContent = roleInfo.name;
    document.getElementById('your-role').className = roleInfo.className;
    document.getElementById('player-info').classList.remove('hidden');
    
    // Обновляем список игроков
    updatePlayersList(data.players);
    
    if (isHost) {
        showMessage('Роли разданы!', 'success');
        document.getElementById('reveal-btn').disabled = false;
    } else {
        showMessage('Вам выдана роль!', 'success');
    }
});

socket.on('roles-revealed', (data) => {
    // Показываем все роли
    updatePlayersList(data.players.map(p => ({
        ...p,
        role: p.role // теперь у всех видна роль
    })));
    
    showMessage('Все роли раскрыты!', 'success');
});

socket.on('error', (data) => {
    showMessage(data.message, 'error');
});

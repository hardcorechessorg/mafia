import { io } from "socket.io-client";


const socket = io();


const app = document.getElementById('app');


let state = {
room: null,
isHost: false,
players: [],
};


function renderHome() {
app.innerHTML = `
<h1>Мафия Онлайн</h1>
<input id="name" placeholder="Имя" />
<button id="create">Создать игру</button>
`;


document.getElementById('create').onclick = () => {
const name = document.getElementById('name').value || 'Игрок';
socket.emit('create-room', { name });
};
}


function renderLobby() {
app.innerHTML = `
<h2>Комната ${state.room}</h2>


<h3>Игроки</h3>
${state.players.map(p => `<div class="player">${p}</div>`).join('')}


${state.isHost ? `
<h3>Настройки</h3>
<label>Мафия: <input id="mafia" type="number" value="2" min="1" /></label><br />
<label><input id="cop" type="checkbox" checked /> Комиссар</label><br />
<label><input id="doc" type="checkbox" checked /> Доктор</label><br />
<button id="start">Начать игру</button>
` : '<p>Ожидание ведущего…</p>'}
`;
renderHome()}


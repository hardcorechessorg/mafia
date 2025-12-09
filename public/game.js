function generateRoles() {
const mafia = parseInt(document.getElementById("mafiaCount").value);
const sheriff = parseInt(document.getElementById("sheriffCount").value);
const doctor = parseInt(document.getElementById("doctorCount").value);
const killer = parseInt(document.getElementById("killerCount").value);
const civil = parseInt(document.getElementById("civilCount").value);


const roles = [];


for (let i = 0; i < mafia; i++) roles.push("Мафия");
for (let i = 0; i < sheriff; i++) roles.push("Шериф");
for (let i = 0; i < doctor; i++) roles.push("Доктор");
for (let i = 0; i < killer; i++) roles.push("Киллер");
for (let i = 0; i < civil; i++) roles.push("Мирный");


// перемешивание
for (let i = roles.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[roles[i], roles[j]] = [roles[j], roles[i]];
}


return roles;
}


// вывод
const btn = document.getElementById("generateBtn");
btn.addEventListener("click", () => {
const result = generateRoles();
document.getElementById("result").textContent = result.join("\n");
});

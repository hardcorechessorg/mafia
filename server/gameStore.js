  export const games = {}

export function createGame(settings) {
  const code = 'MAFIA-' + Math.floor(1000 + Math.random() * 9000)
  games[code] = {
    code,
    settings,
    players: []
  }
  return games[code]
}

export function joinGame(code, name, role) {
  games[code].players.push({ name, role })
}

export function getGame(code) {
  return games[code]
}

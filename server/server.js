const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];
let gameState = {
    ball: { x: 650, y: 400 },
    velocity: { x: 5, y: 5 },
    paddles: { left: 400, right: 400 },
};

const broadcastGameState = () => {
    const message = JSON.stringify({
        type: 'update',
        state: gameState,
    });
    players.forEach((player) => {
        player.ws.send(message);
    });
};

wss.on('connection', (ws) => {
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        ws.close();
        return;
    }

    const playerId = players.length === 0 ? 'left' : 'right';
    players.push({ ws, id: playerId });
    console.log(`Player ${playerId} connected`);

    ws.send(JSON.stringify({ type: 'connected', playerId }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'movePaddle') {
            gameState.paddles[data.playerId] = data.position;
        }
    });


    ws.on('close', () => {
        players = players.filter((player) => player.ws !== ws);
        console.log(`Player ${playerId} disconnected`);
        if (players.length === 0) {
            console.log('All players disconnected. Resetting game state.');
            gameState = {
                ball: { x: 650, y: 400 },
                velocity: { x: 5, y: 5 },
                paddles: { left: 400, right: 400 },
            };
        }
    });
});

setInterval(() => {
    if (players.length === 2) {
        const { ball, velocity } = gameState;

        ball.x += velocity.x;
        ball.y += velocity.y;

        if (ball.y <= 0 || ball.y >= 800) velocity.y *= -1;

        if (
            (ball.x <= 35 && ball.y >= gameState.paddles.left && ball.y <= gameState.paddles.left + 200) ||
            (ball.x >= 1265 && ball.y >= gameState.paddles.right && ball.y <= gameState.paddles.right + 200)
        ) {
            velocity.x *= -1;
        }

        if (ball.x <= 0 || ball.x >= 1300) {
            ball.x = 650;
            ball.y = 400;
            velocity.x = 5 * (Math.random() > 0.5 ? 1 : -1);
            velocity.y = 5 * (Math.random() > 0.5 ? 1 : -1);
        }

        broadcastGameState();
    }
}, 1000 / 120);

console.log('WebSocket server is running on ws://localhost:8080');

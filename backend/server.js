const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Connected user:', socket.id);

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms.set(roomId, {
            players: [socket.id],
            choices: {}
        });
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomId);
            socket.emit('joinedRoom', roomId);
            io.to(roomId).emit('gameReady', true);
        } else {
            socket.emit('error', 'The room is full or does not exist');
        }
    });

    socket.on('makeChoice', ({ roomId, choice }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.choices[socket.id] = choice;
            
            if (Object.keys(room.choices).length === 2) {
                const result = calculateWinner(room.choices);
                io.to(roomId).emit('gameResult', result);
                room.choices = {}; 
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        for (const [roomId, room] of rooms.entries()) {
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit('playerDisconnected');
                rooms.delete(roomId);
            }
        }
    });
});

function calculateWinner(choices) {
    const players = Object.entries(choices);
    const [player1Id, choice1] = players[0];
    const [player2Id, choice2] = players[1];

    if (choice1 === choice2) return { result: 'draw', winner: null };

    const wins = {
        'rock': 'scissors',
        'paper': 'rock',
        'scissors': 'paper'
    };

    if (wins[choice1] === choice2) {
        return { result: 'win', winner: player1Id };
    } else {
        return { result: 'win', winner: player2Id };
    }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is available on port ${PORT}`);
});
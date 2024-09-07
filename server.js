const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let posts = []; // Simula um banco de dados

// Rota para adicionar uma postagem
app.post('/posts', (req, res) => {
    const { content, imageUrl } = req.body;
    const post = {
        id: posts.length + 1,
        content,
        image: imageUrl,
    };
    posts.push(post);
    res.status(201).json(post);
    io.emit('new-post', post); // Emite o evento de nova postagem para todos os clientes
});

// Rota para obter todas as postagens
app.get('/posts', (req, res) => {
    res.json(posts);
});

// Rota para excluir uma postagem
app.delete('/posts/:id', (req, res) => {
    const { id } = req.params;
    posts = posts.filter(post => post.id != id);
    res.status(204).end();
    io.emit('post-deleted', id); // Emite o evento de exclusão para todos os clientes
});

// Inicia o servidor
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});

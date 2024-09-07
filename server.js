const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Configurações do servidor
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;
const secretKey = 'your-secret-key'; // Use uma chave secreta para JWT

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost/social-network', { useNewUrlParser: true, useUnifiedTopology: true });

// Definir o modelo do usuário
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});
const User = mongoose.model('User', userSchema);

// Definir o modelo do Post
const postSchema = new mongoose.Schema({
    user: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// Rota para registrar um novo usuário
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Rota para login de usuário
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send('Invalid credentials');
        }
        const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Middleware para autenticação
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Rota para obter todos os posts (autenticada)
app.get('/posts', authenticateToken, async (req, res) => {
    try {
        const posts = await Post.find().sort({ timestamp: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Rota para criar um novo post (autenticada)
app.post('/posts', authenticateToken, async (req, res) => {
    try {
        const post = new Post(req.body);
        await post.save();
        io.emit('newPost', post); // Envia o novo post para todos os clientes conectados
        res.status(201).json(post);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// WebSocket para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Recebe posts do cliente
    socket.on('getPosts', () => {
        Post.find().sort({ timestamp: -1 }).then(posts => {
            socket.emit('posts', posts);
        });
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Iniciar o servidor
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const express = require('express');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
// const router = express.Router();
// const User = require('../models/user');

// ===Import routes===
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

const app = express();
app.use(express.json());
app.use(cookieParser());

connectDB();

app.get('/', (req, res) => {
    res.json({data: 'User API is running'}, {status: 200});
})

app.use('/api/auth', authRoutes);

app.use('/api/profile', profileRoutes); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
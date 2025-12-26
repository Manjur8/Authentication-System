const express = require('express');
const connectDB = require('./config/db');
// const router = express.Router();
// const User = require('../models/user');

const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
    res.json({data: 'User API is running'}, {status: 200});
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
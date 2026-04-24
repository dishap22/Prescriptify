const express = require('express');
const app = express();
app.use(express.json());

app.post('/verify', (req, res) => {
    const { doctorId } = req.body;
    const isValid = !!doctorId;
    res.json({ isValid });
});

app.listen(5002, () => console.log('Auth Service running on 5002'));

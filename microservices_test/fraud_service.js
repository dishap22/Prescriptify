const express = require('express');
const app = express();
app.use(express.json());

app.post('/verify', (req, res) => {
    const { medications } = req.body;
    let isValid = true;
    for (const med of medications) {
        if (med.duration > 365) {
            isValid = false;
            break;
        }
    }
    res.json({ isValid });
});

app.listen(5003, () => console.log('Fraud Service running on 5003'));

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripeRoutes = require('./routes/stripeRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', stripeRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

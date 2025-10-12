const express = require('express');
const cors = require('cors');
const routes = require('./routes/clientRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => console.log(`Client service running at http://localhost:${PORT}`));

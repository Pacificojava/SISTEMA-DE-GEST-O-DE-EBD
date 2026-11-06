import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Rota de text
app.get('/', (req, res) => {
  res.json({ status: 'API a funcionar com sucesso!' });
});

// Inicia o servidor para o Railway
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Servidor a correr na porta ${port}`);
});

export default app;
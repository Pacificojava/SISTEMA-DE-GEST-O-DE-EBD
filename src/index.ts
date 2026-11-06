import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Rota de teste simples para saberes se a API está online
app.get('/', (req, res) => {
  res.json({ status: 'API a funcionar com sucesso!' });
});

// Se estiver a correr localmente ou no Railway, inicia o servidor na porta
if (process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Servidor a correr na porta ${port}`);
  });
}

// Exportação necessária para a Vercel (Serverless)
export default app;
module.exports = app;
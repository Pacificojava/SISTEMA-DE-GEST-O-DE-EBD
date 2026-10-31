import mysql from 'mysql2';

// Criação da conexão com o banco de dados MySQL
const connection = mysql.createConnection({
  host: 'localhost',      // Geralmente é 'localhost' se o MySQL estiver na sua máquina
  user: 'root',           // O seu utilizador do MySQL (ex: root)
  password: '',           // A sua palavra-passe do MySQL (deixe vazio se não tiver)
  database: 'ebd_db'      // Substitua pelo nome do seu banco de dados da EBD
});

// Testando a conexão
connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conexão bem-sucedida ao banco de dados MySQL da EBD!');
});

export default connection;
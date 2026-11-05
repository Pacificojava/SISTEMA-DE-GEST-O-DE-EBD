import db from './db';

const query = 'SELECT * FROM alunos';

console.log('Consultando alunos cadastrados na EBD...\n');

db.all(query, [], (err: Error | null, rows: unknown[]) => {
  if (err) {
    console.error('Erro ao consultar alunos:', err.message);
    return;
  }

  console.table(rows);
});

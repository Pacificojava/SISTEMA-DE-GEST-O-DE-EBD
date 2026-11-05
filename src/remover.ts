import db from './db';

const idAlunoParaRemover = 3;
const query = 'DELETE FROM alunos WHERE id = ?';

db.run(query, [idAlunoParaRemover], function (err: Error | null) {
  if (err) {
    console.error('Erro ao remover aluno:', err.message);
    return;
  }

  const runResult = this as { changes: number };

  if (runResult.changes > 0) {
    console.log(`Aluno com o ID ${idAlunoParaRemover} removido com sucesso!`);
  } else {
    console.log(`Nenhum aluno foi encontrado com o ID ${idAlunoParaRemover}.`);
  }
});

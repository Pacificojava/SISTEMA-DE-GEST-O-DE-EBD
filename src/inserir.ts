import db from './db';

const novoAluno = {
  nome: 'Lucas Gabriel',
  idade: 14,
  classe: 'Adolescentes',
};

const query = 'INSERT INTO alunos (nome, idade, classe) VALUES (?, ?, ?)';

db.run(query, [novoAluno.nome, novoAluno.idade, novoAluno.classe], function (err: Error | null) {
  if (err) {
    console.error('Erro ao inserir aluno:', err.message);
    return;
  }

  const runResult = this as { lastID: number };
  console.log(`Aluno cadastrado com sucesso! ID gerado: ${runResult.lastID}`);
});
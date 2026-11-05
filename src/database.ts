import path from 'path';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');

export const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Erro ao conectar ao SQLite:', error.message);
    return;
  }

  console.log('Conexão bem-sucedida ao banco de dados SQLite (SSS).');
});

let databaseInitialized = false;

export type DatabaseRunResult = {
  lastID: number;
  changes: number;
};

export async function run(sql: string, params: unknown[] = []): Promise<DatabaseRunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: Number(this.lastID),
        changes: Number(this.changes),
      });
    });
  });
}

export async function get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve((row as T | null) ?? null);
    });
  });
}

export async function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve((rows as T[]) ?? []);
    });
  });
}

async function enableForeignKeys(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('PRAGMA foreign_keys = ON;', (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function initializeDatabase(): Promise<void> {
  if (databaseInitialized) {
    return;
  }

  try {
    await enableForeignKeys();

    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS igrejas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_institucao TEXT NOT NULL,
        chave_contexto TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa'))
      )`,
      `CREATE TABLE IF NOT EXISTS congregacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_igreja INTEGER NOT NULL,
        nome_congregacao TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
        FOREIGN KEY (id_igreja) REFERENCES igrejas(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        nivel_perfil TEXT NOT NULL CHECK (nivel_perfil IN ('secretaria_geral', 'auxiliar_secretaria')),
        id_igreja INTEGER DEFAULT 1,
        id_congregacao INTEGER NULL,
        FOREIGN KEY (id_igreja) REFERENCES igrejas(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_classe TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS cargos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        ativo INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        idade INTEGER NOT NULL CHECK (idade >= 0),
        cargo TEXT NOT NULL DEFAULT 'Membro',
        classe_id INTEGER NOT NULL,
        UNIQUE (nome, idade, classe_id),
        FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE RESTRICT
      )`,
      `CREATE TABLE IF NOT EXISTS frequencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_aula TEXT NOT NULL,
        aluno_id INTEGER NOT NULL,
        classe_id INTEGER NOT NULL,
        presente INTEGER NOT NULL CHECK (presente IN (0, 1)),
        UNIQUE (data_aula, aluno_id, classe_id),
        FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
        FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE RESTRICT
      )`,
      `CREATE TABLE IF NOT EXISTS agendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data_evento TEXT NOT NULL,
        horario TEXT,
        local TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ];

    for (const statement of schemaStatements) {
      await run(statement);
    }

    const columnsUsuarios = await all<{ name: string }>('PRAGMA table_info(usuarios)');
    const hasIdIgreja = columnsUsuarios.some((column) => column.name === 'id_igreja');
    const hasIdCongregacao = columnsUsuarios.some((column) => column.name === 'id_congregacao');
    const columnsAlunos = await all<{ name: string }>('PRAGMA table_info(alunos)');
    const hasCargo = columnsAlunos.some((column) => column.name === 'cargo');

    if (!hasIdIgreja) {
      await run('ALTER TABLE usuarios ADD COLUMN id_igreja INTEGER DEFAULT 1');
    }
    if (!hasIdCongregacao) {
      await run('ALTER TABLE usuarios ADD COLUMN id_congregacao INTEGER NULL');
    }
    if (!hasCargo) {
      await run('ALTER TABLE alunos ADD COLUMN cargo TEXT NOT NULL DEFAULT "Membro"');
    }

    const totalIgrejas = await get<{ total: number }>('SELECT COUNT(*) AS total FROM igrejas');
    if ((totalIgrejas?.total ?? 0) === 0) {
      const seedIgrejas = [
        ['Igreja Sede - Assembleia de Deus', 'JodnaMaia', 'ativa'],
        ['Igreja Exemplo - Apicum-Açu', 'AD-ApicumAcu', 'ativa'],
      ];

      for (const igreja of seedIgrejas) {
        await run('INSERT OR IGNORE INTO igrejas (nome_institucao, chave_contexto, status) VALUES (?, ?, ?)', igreja);
      }
    }

    const totalUsuarios = await get<{ total: number }>('SELECT COUNT(*) AS total FROM usuarios');
    if ((totalUsuarios?.total ?? 0) === 0) {
      const defaultIgreja = await get<{ id: number }>('SELECT id FROM igrejas WHERE chave_contexto = ? LIMIT 1', ['JodnaMaia']);
      const defaultIgrejaId = Number(defaultIgreja?.id ?? 1);
      const seedUsuarios: Array<[string, string, string, string, number, number]> = [
        ['Secretaria Geral', 'secretaria', 'Secretaria@123', 'secretaria_geral', defaultIgrejaId, 1],
        ['Auxiliar da Secretaria', 'auxiliar', 'Auxiliar@123', 'auxiliar_secretaria', defaultIgrejaId, 1],
        ['Jodna Maia Gatinho', 'jodna', 'Jodna@2027', 'secretaria_geral', defaultIgrejaId, 1],
        ['Maria Rita', 'maria', 'Maria@2027', 'auxiliar_secretaria', defaultIgrejaId, 1],
      ];

      for (const [nome, login, senha, nivelPerfil, idIgreja, idCongregacao] of seedUsuarios) {
        const hashed = await import('bcryptjs').then(({ default: bcrypt }) => bcrypt.hashSync(senha, 10));
        await run(
          'INSERT OR IGNORE INTO usuarios (nome, login, senha_hash, nivel_perfil, id_igreja, id_congregacao) VALUES (?, ?, ?, ?, ?, ?)',
          [nome, login, hashed, nivelPerfil, idIgreja, idCongregacao],
        );
      }
    }

    const legacySeedPasswords: Array<[string, string, string[]]> = [
      ['secretaria', 'Secretaria@123', ['hash_secretaria_geral']],
      ['auxiliar', 'Auxiliar@123', ['hash_auxiliar_secretaria']],
      ['jodna', 'Jodna@2027', ['hash_jodna_geral', 'hash_jodna_maia']],
      ['maria', 'Maria@2027', ['hash_maria_rita', 'hash_maria']],
    ];

    for (const [login, senha, legacyHashes] of legacySeedPasswords) {
      const hash = await import('bcryptjs').then(({ default: bcrypt }) => bcrypt.hashSync(senha, 10));
      const placeholders = legacyHashes.map(() => '?').join(', ');

      await run(
        `UPDATE usuarios SET senha_hash = ? WHERE login = ? AND (senha_hash IS NULL OR senha_hash IN (${placeholders}))`,
        [hash, login, ...legacyHashes],
      );
    }

    await run('UPDATE usuarios SET id_igreja = COALESCE(id_igreja, 1) WHERE id_igreja IS NULL OR id_igreja = 0', []);

    const totalClasses = await get<{ total: number }>('SELECT COUNT(*) AS total FROM classes');
    if ((totalClasses?.total ?? 0) === 0) {
      const seedClasses = [
        ['Infantil'],
        ['Jovens'],
        ['Adultos'],
        ['Seminário'],
      ];

      for (const classe of seedClasses) {
        await run('INSERT OR IGNORE INTO classes (nome_classe) VALUES (?)', classe);
      }
    }

    const totalCargos = await get<{ total: number }>('SELECT COUNT(*) AS total FROM cargos');
    if ((totalCargos?.total ?? 0) === 0) {
      const seedCargos = [
        'Pastor',
        'Professor(a)',
        'Porteiro',
        'Auxiliar Financeiro(a)',
        'Auxiliar da Sec. de Educação Cristã',
        'Secretário(a) Geral',
        'Tesoureiro(a)',
        'Mídia',
        'Membro',
      ];

      for (const nomeCargo of seedCargos) {
        await run('INSERT OR IGNORE INTO cargos (nome, ativo) VALUES (?, 1)', [nomeCargo]);
      }
    }

    const totalAlunos = await get<{ total: number }>('SELECT COUNT(*) AS total FROM alunos');
    if ((totalAlunos?.total ?? 0) === 0) {
      const seedAlunos = [
        ['Maria Silva', 12, 1, 'Professor(a)'],
        ['João Pereira', 16, 2, 'Pastor'],
        ['Lucas Costa', 20, 3, 'Auxiliar Financeiro(a)'],
        ['Ana Souza', 27, 3, 'Auxiliar da Sec. de Educação Cristã'],
        ['Pedro Santos', 14, 2, 'Membro'],
      ];

      const defaultClasses = await all<{ id: number }>('SELECT id FROM classes ORDER BY id ASC');

      for (const aluno of seedAlunos) {
        const classeId = Number(aluno[2]);
        const actualClasseId = defaultClasses.find((item) => item.id === classeId)?.id ?? defaultClasses[0]?.id;

        if (!actualClasseId) {
          continue;
        }

        await run('INSERT OR IGNORE INTO alunos (nome, idade, cargo, classe_id) VALUES (?, ?, ?, ?)', [aluno[0], aluno[1], aluno[3], actualClasseId]);
      }
    }

    const totalFrequencias = await get<{ total: number }>('SELECT COUNT(*) AS total FROM frequencias');
    if ((totalFrequencias?.total ?? 0) === 0) {
      const alunos = await all<{ id: number; classe_id: number }>('SELECT id, classe_id FROM alunos ORDER BY id ASC');
      const seedFrequencias = [
        ['2026-11-01', 1, 1, 1],
        ['2026-11-01', 2, 2, 1],
        ['2026-11-01', 3, 3, 0],
        ['2026-11-02', 1, 1, 1],
        ['2026-11-02', 2, 2, 0],
        ['2026-11-02', 4, 3, 1],
        ['2026-11-03', 5, 2, 1],
      ];

      for (const frequencia of seedFrequencias) {
        const alunoId = Number(frequencia[1]);
        const alunoExiste = alunos.some((aluno) => aluno.id === alunoId);

        if (!alunoExiste) {
          continue;
        }

        const classeId = Number(frequencia[2]);
        const classeExiste = await get<{ id: number }>('SELECT id FROM classes WHERE id = ?', [classeId]);

        if (!classeExiste) {
          continue;
        }

        await run(
          'INSERT OR IGNORE INTO frequencias (data_aula, aluno_id, classe_id, presente) VALUES (?, ?, ?, ?)',
          frequencia,
        );
      }
    }

    const totalAgendas = await get<{ total: number }>('SELECT COUNT(*) AS total FROM agendas');
    if ((totalAgendas?.total ?? 0) === 0) {
      const seedAgendas = [
        ['Reunião de líderes', 'Planejamento semanal com líderes de turma.', '2026-11-08', '08:30', 'Sala 2'],
        ['Aula de Jovens', 'Aula especial para adolescentes e jovens.', '2026-11-10', '19:00', 'Auditório'],
        ['Visita pastoral', 'Visita da equipe pastoral à unidade EBD.', '2026-11-12', '09:00', 'Igreja'],
      ];

      for (const agenda of seedAgendas) {
        await run(
          'INSERT OR IGNORE INTO agendas (titulo, descricao, data_evento, horario, local) VALUES (?, ?, ?, ?, ?)',
          agenda,
        );
      }
    }

    databaseInitialized = true;
    console.log('Banco de dados SSS inicializado com sucesso.');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro ao inicializar o banco SSS:', error.message);
    }

    throw error;
  }
}

const alunosTableBody = document.querySelector('#alunosTableBody');
const alunoSelect = document.querySelector('#alunoSelect');
const classeSelect = document.querySelector('#classeSelect');
const frequenciaForm = document.querySelector('#frequenciaForm');
const totalAlunosStat = document.querySelector('#totalAlunosStat');
const totalClassesStat = document.querySelector('#totalClassesStat');
const presencasStat = document.querySelector('#presencasStat');
const taxaPresencaStat = document.querySelector('#taxaPresencaStat');
const statusButtons = document.querySelectorAll('.status-btn');

let presenteAtual = true;

function setStatus(value) {
  presenteAtual = value;

  statusButtons.forEach((button) => {
    const isSelected = button.dataset.presente === String(value);
    button.classList.toggle('active', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

async function carregarClasses() {
  try {
    const resposta = await fetch('/api/classes');
    const classes = await resposta.json();

    if (!Array.isArray(classes)) {
      throw new Error('Resposta inválida da API de turmas.');
    }

    classeSelect.innerHTML = '<option value="">Escolha a turma</option>' +
      classes.map((classe) => `<option value="${classe.id}">${classe.nome_classe}</option>`).join('');
  } catch (error) {
    console.error('Erro ao carregar classes:', error);
    classeSelect.innerHTML = '<option value="">Erro ao carregar turmas</option>';
  }
}

async function carregarAlunos() {
  try {
    const resposta = await fetch('/api/alunos');
    const alunos = await resposta.json();

    if (!Array.isArray(alunos)) {
      throw new Error('Resposta inválida da API de alunos.');
    }

    if (alunoSelect) {
      alunoSelect.innerHTML = '<option value="">Selecione o aluno</option>' +
        alunos.map((aluno) => `<option value="${aluno.id}">${aluno.nome}</option>`).join('');
    }

    if (alunosTableBody) {
      alunosTableBody.innerHTML = alunos.map((aluno) => `
        <tr>
          <td>${aluno.nome}</td>
          <td>${aluno.classe_nome}</td>
          <td>${aluno.idade} anos</td>
          <td><span class="badge badge-good">Ativo</span></td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar alunos:', error);

    if (alunoSelect) {
      alunoSelect.innerHTML = '<option value="">Erro ao carregar alunos</option>';
    }

    if (alunosTableBody) {
      alunosTableBody.innerHTML = '<tr><td colspan="4">Não foi possível carregar os alunos.</td></tr>';
    }
  }
}

async function carregarDashboardStats() {
  try {
    const resposta = await fetch('/api/dashboard/stats');
    const stats = await resposta.json();

    if (!stats || typeof stats !== 'object') {
      return;
    }

    if (totalAlunosStat) {
      totalAlunosStat.textContent = stats.totalAlunos ?? '0';
    }

    if (totalClassesStat) {
      totalClassesStat.textContent = stats.totalClasses ?? '0';
    }

    if (presencasStat) {
      presencasStat.textContent = `${stats.presencas ?? 0} / ${stats.totalFrequencias ?? 0}`;
    }

    if (taxaPresencaStat) {
      taxaPresencaStat.textContent = `${stats.taxaPresenca ?? 0}%`;
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

statusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setStatus(button.dataset.presente === 'true');
  });
});

if (frequenciaForm) {
  frequenciaForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const alunoId = Number(alunoSelect?.value ?? 0);
    const classeId = Number(classeSelect?.value ?? 0);

    if (!alunoId || !classeId) {
      alert('Selecione um aluno e uma turma antes de salvar a presença.');
      return;
    }

    const payload = {
      aluno_id: alunoId,
      classe_id: classeId,
      presente: presenteAtual,
      data_aula: new Date().toISOString().slice(0, 10),
    };

    try {
      const resposta = await fetch('/api/frequencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.error || 'Não foi possível registrar a presença.');
      }

      alert('Presença registrada com sucesso!');
      frequenciaForm.reset();
      setStatus(true);
      await carregarAlunos();
      await carregarDashboardStats();
    } catch (error) {
      console.error('Erro ao salvar presença:', error);
      alert(error.message || 'Erro ao salvar presença.');
    }
  });
}

setStatus(true);
carregarClasses();
carregarAlunos();
carregarDashboardStats();

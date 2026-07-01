require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexao com o Postgres (Neon, Render, etc). Usa SSL em produção.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

// Cria as tabelas se nao existirem
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jogos (
      id SERIAL PRIMARY KEY,
      time_casa TEXT NOT NULL,
      time_fora TEXT NOT NULL,
      fase TEXT,
      data_jogo TIMESTAMP,
      placar_casa_real INTEGER,
      placar_fora_real INTEGER,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS palpites (
      id SERIAL PRIMARY KEY,
      jogo_id INTEGER NOT NULL REFERENCES jogos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      placar_casa INTEGER NOT NULL,
      placar_fora INTEGER NOT NULL,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Banco de dados pronto.');
}

// ---------- ROTAS DE JOGOS ----------

// Lista todos os jogos, ordenados por data
app.get('/api/jogos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM jogos ORDER BY data_jogo ASC NULLS LAST, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar jogos' });
  }
});

// Cria um novo jogo (admin)
app.post('/api/jogos', async (req, res) => {
  const { time_casa, time_fora, fase, data_jogo } = req.body;
  if (!time_casa || !time_fora) {
    return res.status(400).json({ erro: 'Informe os dois times' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO jogos (time_casa, time_fora, fase, data_jogo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [time_casa, time_fora, fase || null, data_jogo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar jogo' });
  }
});

// Atualiza o placar real de um jogo (admin, depois que o jogo termina)
app.put('/api/jogos/:id/resultado', async (req, res) => {
  const { id } = req.params;
  const { placar_casa_real, placar_fora_real } = req.body;
  try {
    const result = await pool.query(
      `UPDATE jogos SET placar_casa_real = $1, placar_fora_real = $2
       WHERE id = $3 RETURNING *`,
      [placar_casa_real, placar_fora_real, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Jogo nao encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar resultado' });
  }
});

// Remove um jogo (admin)
app.delete('/api/jogos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM jogos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover jogo' });
  }
});

// ---------- ROTAS DE PALPITES ----------

// Lista os palpites de um jogo
app.get('/api/jogos/:id/palpites', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM palpites WHERE jogo_id = $1 ORDER BY criado_em ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar palpites' });
  }
});

// Cria um palpite (qualquer usuario, sem senha - so o nome)
app.post('/api/jogos/:id/palpites', async (req, res) => {
  const { nome, placar_casa, placar_fora } = req.body;
  const jogoId = req.params.id;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Informe o nome' });
  }
  if (placar_casa === undefined || placar_fora === undefined) {
    return res.status(400).json({ erro: 'Informe o placar' });
  }

  try {
    // Se a mesma pessoa (mesmo nome) ja palpitou nesse jogo, atualiza o palpite
    const existente = await pool.query(
      'SELECT id FROM palpites WHERE jogo_id = $1 AND LOWER(nome) = LOWER($2)',
      [jogoId, nome.trim()]
    );

    let result;
    if (existente.rows.length > 0) {
      result = await pool.query(
        `UPDATE palpites SET placar_casa = $1, placar_fora = $2, criado_em = NOW()
         WHERE id = $3 RETURNING *`,
        [placar_casa, placar_fora, existente.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO palpites (jogo_id, nome, placar_casa, placar_fora)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [jogoId, nome.trim(), placar_casa, placar_fora]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar palpite' });
  }
});

// ---------- RANKING (quem mais acertou) ----------

app.get('/api/ranking', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.nome,
        COUNT(*) FILTER (
          WHERE j.placar_casa_real IS NOT NULL
          AND p.placar_casa = j.placar_casa_real
          AND p.placar_fora = j.placar_fora_real
        ) AS placar_exato,
        COUNT(*) FILTER (
          WHERE j.placar_casa_real IS NOT NULL
          AND (
            SIGN(p.placar_casa - p.placar_fora) = SIGN(j.placar_casa_real - j.placar_fora_real)
          )
        ) AS acertou_vencedor
      FROM palpites p
      JOIN jogos j ON j.id = p.jogo_id
      GROUP BY p.nome
      ORDER BY placar_exato DESC, acertou_vencedor DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar ranking' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DiahBet rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao iniciar banco de dados:', err);
    process.exit(1);
  });

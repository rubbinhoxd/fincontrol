# FinControl — Proposta de Produto e Arquitetura

---

## 1. Definicao do Produto

**Problema que resolve:**
A maioria dos apps financeiros foca em *registrar* transacoes. O problema real nao e falta de registro — e falta de **consciencia em tempo real** sobre o impacto de cada gasto no orcamento do mes. Voce registra uma compra mas nao tem clareza imediata de "quanto ainda posso gastar hoje?".

**Objetivo principal:**
Ser um **painel de autocontrole financeiro mensal** que transforma dados brutos (salario, gastos) em informacoes acionaveis para decisao no dia a dia.

**Proposta de valor:**
"Saiba em segundos se voce pode gastar isso hoje, sem comprometer o mes."

**Perfil do usuario:**
Profissional CLT com renda fixa mensal, que quer gastar menos sem precisar de planilhas complexas. Uso pessoal, possivelmente compartilhado com parceira.

---

## 2. Escopo do MVP

### Entra agora (MVP)

- Cadastro de referencia financeira mensal (salario)
- CRUD completo de transacoes (receitas e despesas)
- Classificacao rica de despesas (planejada, fixa, impulso, essencial, assinatura, recorrente)
- Dashboard do mes atual com totalizadores e indicadores de controle
- Historico de lancamentos com filtros (mes, categoria, tipo)
- Categorias pre-definidas com possibilidade de CRUD
- Autenticacao simples (um usuario, login basico com JWT)

### Fica para depois (v2+)

- Metas financeiras por categoria
- Orcamento mensal por categoria
- Alertas/notificacoes push
- Graficos avancados (evolucao, tendencias)
- Suporte multi-usuario e compartilhamento
- Import de extratos bancarios (CSV/OFX)
- App mobile (React Native)
- Lancamentos recorrentes automaticos
- Autenticacao OAuth / social login

**Justificativa:** O MVP deve resolver o problema central — consciencia financeira no mes atual. Tudo que nao contribui diretamente para isso pode esperar.

---

## 3. Telas Principais

| # | Tela | Funcao |
|---|------|--------|
| 1 | **Login** | Autenticacao simples |
| 2 | **Dashboard** | Painel principal do mes atual — totalizadores, indicadores, alertas visuais |
| 3 | **Nova Transacao** | Formulario para registrar receita ou despesa com classificacoes |
| 4 | **Historico / Listagem** | Lista de transacoes com filtros por mes, categoria, tipo |
| 5 | **Edicao de Transacao** | Editar/excluir um lancamento existente |
| 6 | **Categorias** | CRUD de categorias de despesa/receita |
| 7 | **Referencia Mensal** | Configurar salario e parametros do mes (renda esperada, meta de economia) |

### Dashboard — Detalhamento

O dashboard e o coracao do produto. Ele deve mostrar:

**Bloco 1 — Resumo do Mes**
- Salario de referencia
- Total recebido (receitas reais)
- Total gasto
- Saldo restante (recebido - gasto)

**Bloco 2 — Composicao dos Gastos**
- Gastos fixos (R$ e %)
- Gastos variaveis (R$ e %)
- Assinaturas (R$ e %)
- Gastos nao planejados (R$ e %)
- Gastos por impulso (R$ e %)

**Bloco 3 — Indicadores de Controle**
- % do salario ja comprometido
- Quanto ainda posso gastar no mes
- Media disponivel por dia ate o fim do mes
- Categoria que mais consome dinheiro
- Comparacao simples com mes anterior (total gasto)

**Bloco 4 — Alertas Visuais**
- Verde: < 70% do salario comprometido
- Amarelo: 70-90% comprometido
- Vermelho: > 90% comprometido
- Barra de progresso visual do consumo do salario

---

## 4. Regras de Negocio

### Calculos principais

```
Saldo do Mes = Total Receitas do Mes - Total Despesas do Mes

% Comprometido = (Total Despesas / Salario de Referencia) x 100

Disponivel no Mes = Salario de Referencia - Total Despesas

Media Diaria Disponivel = Disponivel no Mes / Dias Restantes no Mes
  (se dias restantes = 0, mostrar apenas o saldo)

Total Nao Planejado = soma das despesas onde planned = false

Total Impulso = soma das despesas onde impulse = true
```

### Classificacao de despesas

Cada despesa possui flags independentes (nao mutuamente exclusivas):
- **planned** (boolean): foi prevista no orcamento mental do mes?
- **fixed** (boolean): e um gasto fixo mensal (aluguel, condominio)?
- **recurring** (boolean): se repete todo mes?
- **subscription** (boolean): e uma assinatura (Netflix, Spotify)?
- **essential** (boolean): e essencial para viver (alimentacao, moradia)?
- **impulse** (boolean): foi uma compra por impulso?

**Regra:** `subscription = true` implica `recurring = true` automaticamente.
**Regra:** `impulse = true` implica `planned = false` automaticamente.

### Referencia mensal

- Todo mes tem uma referencia financeira (salario esperado)
- Se nao configurada para o mes atual, herda do mes anterior
- O usuario pode ter receitas extras alem do salario (bonus, freelance)

### Mes de referencia

- O mes de referencia de uma transacao e determinado pela **data da transacao**, nao pela data de cadastro
- O dashboard sempre abre no mes atual

---

## 5. Modelagem de Dados

### Entidades e campos

**User**
```
id              UUID (PK)
name            VARCHAR(100)
email           VARCHAR(150) UNIQUE
password_hash   VARCHAR(255)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Category**
```
id              UUID (PK)
user_id         UUID (FK -> User)
name            VARCHAR(60)
type            ENUM('INCOME', 'EXPENSE')
icon            VARCHAR(30) nullable
color           VARCHAR(7) nullable   -- hex color
active          BOOLEAN default true
created_at      TIMESTAMP
```

**MonthlyReference**
```
id              UUID (PK)
user_id         UUID (FK -> User)
year_month      VARCHAR(7)            -- "2026-04"
salary          DECIMAL(12,2)
notes           TEXT nullable
created_at      TIMESTAMP
updated_at      TIMESTAMP
UNIQUE(user_id, year_month)
```

**Transaction**
```
id              UUID (PK)
user_id         UUID (FK -> User)
category_id     UUID (FK -> Category)
type            ENUM('INCOME', 'EXPENSE')
description     VARCHAR(200)
amount          DECIMAL(12,2)
transaction_date DATE
-- flags de classificacao (apenas para EXPENSE)
planned         BOOLEAN default true
fixed           BOOLEAN default false
recurring       BOOLEAN default false
subscription    BOOLEAN default false
essential       BOOLEAN default true
impulse         BOOLEAN default false
notes           TEXT nullable
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Relacionamentos

```
User 1 ---- N Category
User 1 ---- N MonthlyReference
User 1 ---- N Transaction
Category 1 ---- N Transaction
```

### Categorias pre-definidas (seed)

**Despesas:** Moradia, Alimentacao, Transporte, Saude, Educacao, Lazer, Assinaturas, Vestuario, Outros
**Receitas:** Salario, Freelance, Investimentos, Outros

### Justificativa da modelagem

- Receitas e despesas na mesma tabela (`Transaction`) com `type` discriminador — simplifica queries, filtros e o CRUD. Nao justifica tabelas separadas no MVP.
- Flags booleanos em vez de tabela de tags — mais simples, mais performatico para queries de agregacao, e o conjunto de classificacoes e fixo e conhecido.
- `MonthlyReference` separada de `Transaction` — o salario de referencia nao e uma transacao, e um parametro de configuracao do mes.
- UUID como PK — facilita merge futuro se houver multi-device, e evita exposicao de IDs sequenciais na API.

---

## 6. Arquitetura Tecnica

### Visao geral

```
+---------------+       HTTP/JSON       +----------------+       JDBC       +--------------+
|   React SPA   | <------------------> |   Spring Boot   | <--------------> |  PostgreSQL  |
|   (Vite)      |       REST API       |   (Monolito)    |                  |              |
+---------------+                      +----------------+                  +--------------+
```

### Backend — Estrutura de pastas

```
fincontrol-api/
├── src/main/java/com/fincontrol/
│   ├── FincontrolApplication.java
│   ├── config/                    # Configuracoes (Security, CORS, etc)
│   │   ├── SecurityConfig.java
│   │   └── CorsConfig.java
│   ├── controller/                # REST Controllers
│   │   ├── AuthController.java
│   │   ├── TransactionController.java
│   │   ├── CategoryController.java
│   │   ├── MonthlyReferenceController.java
│   │   └── DashboardController.java
│   ├── dto/                       # Request/Response DTOs
│   │   ├── request/
│   │   └── response/
│   ├── entity/                    # JPA Entities
│   │   ├── User.java
│   │   ├── Transaction.java
│   │   ├── Category.java
│   │   └── MonthlyReference.java
│   ├── enums/
│   │   └── TransactionType.java
│   ├── repository/                # Spring Data JPA Repositories
│   │   ├── TransactionRepository.java
│   │   ├── CategoryRepository.java
│   │   └── MonthlyReferenceRepository.java
│   ├── service/                   # Logica de negocio
│   │   ├── TransactionService.java
│   │   ├── CategoryService.java
│   │   ├── MonthlyReferenceService.java
│   │   └── DashboardService.java
│   ├── exception/                 # Exception handling
│   │   ├── GlobalExceptionHandler.java
│   │   └── ResourceNotFoundException.java
│   └── security/                  # JWT e autenticacao
│       ├── JwtTokenProvider.java
│       └── JwtAuthenticationFilter.java
├── src/main/resources/
│   ├── application.yml
│   ├── db/migration/              # Flyway migrations
│   │   ├── V1__create_users.sql
│   │   ├── V2__create_categories.sql
│   │   ├── V3__create_monthly_references.sql
│   │   ├── V4__create_transactions.sql
│   │   └── V5__seed_categories.sql
│   └── application-dev.yml
├── pom.xml
└── docker-compose.yml             # PostgreSQL para dev
```

**Justificativas:**
- **Camadas controller/service/repository:** padrao classico Spring — simples, previsivel, facil de navegar. Nao precisa de hexagonal/clean arch para um projeto deste porte.
- **DTOs separados de entities:** evita expor detalhes do banco na API e permite validacoes especificas por operacao.
- **Flyway para migrations:** versionamento do schema do banco — essencial para manter consistencia e reprodutibilidade.
- **Docker Compose:** sobe PostgreSQL localmente sem instalar nada.

### Frontend — Estrutura de pastas

```
fincontrol-web/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/                       # Chamadas HTTP (axios)
│   │   ├── client.ts              # Axios instance configurada
│   │   ├── transactions.ts
│   │   ├── categories.ts
│   │   ├── dashboard.ts
│   │   └── auth.ts
│   ├── components/                # Componentes reutilizaveis
│   │   ├── ui/                    # Botoes, inputs, cards, etc
│   │   ├── layout/                # Header, Sidebar, PageContainer
│   │   └── dashboard/             # Componentes especificos do dashboard
│   ├── pages/                     # Paginas (1 por rota)
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── Categories.tsx
│   │   ├── MonthlyReference.tsx
│   │   └── Login.tsx
│   ├── hooks/                     # Custom hooks
│   ├── contexts/                  # React Context (auth, theme)
│   │   └── AuthContext.tsx
│   ├── types/                     # TypeScript types/interfaces
│   │   └── index.ts
│   ├── utils/                     # Formatters, helpers
│   │   ├── currency.ts
│   │   └── date.ts
│   └── routes/
│       └── index.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── tailwind.config.js
```

**Justificativas:**
- **Vite:** build tool mais rapido e moderno que CRA, que esta deprecated.
- **TypeScript:** seguranca de tipos desde o inicio — custo baixo, beneficio alto.
- **Tailwind CSS:** produtividade alta para UI, sem overhead de design system customizado. Recomendo combinar com **shadcn/ui** para componentes prontos e customizaveis.
- **React Router** para navegacao.
- **Axios** para HTTP — interceptors facilitam tratar token JWT e erros globalmente.
- **Sem Redux** no MVP — React Context + hooks e suficiente para este escopo. State management mais robusto (Zustand ou TanStack Query) pode entrar se necessario.

---

## 7. Banco de Dados — DDL Inicial

```sql
-- V1__create_users.sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- V2__create_categories.sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(60) NOT NULL,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon            VARCHAR(30),
    color           VARCHAR(7),
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, name, type)
);

-- V3__create_monthly_references.sql
CREATE TABLE monthly_references (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    year_month      VARCHAR(7) NOT NULL,
    salary          DECIMAL(12,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, year_month)
);

-- V4__create_transactions.sql
CREATE TABLE transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    category_id       UUID NOT NULL REFERENCES categories(id),
    type              VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    description       VARCHAR(200) NOT NULL,
    amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    transaction_date  DATE NOT NULL,
    planned           BOOLEAN NOT NULL DEFAULT true,
    fixed             BOOLEAN NOT NULL DEFAULT false,
    recurring         BOOLEAN NOT NULL DEFAULT false,
    subscription      BOOLEAN NOT NULL DEFAULT false,
    essential         BOOLEAN NOT NULL DEFAULT true,
    impulse           BOOLEAN NOT NULL DEFAULT false,
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, transaction_date);
```

### Constraints importantes

- `amount > 0` — valor sempre positivo, o `type` define se e entrada ou saida
- `UNIQUE(user_id, year_month)` — um salario de referencia por mes por usuario
- `UNIQUE(user_id, name, type)` — evita categorias duplicadas
- Indices em `user_id + transaction_date` — queries do dashboard sao sempre por usuario e periodo

---

## 8. API REST — Endpoints Iniciais

### Autenticacao

```
POST /api/auth/register
POST /api/auth/login
```

**POST /api/auth/login**
```json
// Request
{ "email": "rubens@email.com", "password": "senha123" }

// Response 200
{ "token": "eyJhbG...", "name": "Rubens" }
```

### Transacoes

```
GET    /api/transactions?yearMonth=2026-04&type=EXPENSE&categoryId=xxx
POST   /api/transactions
GET    /api/transactions/{id}
PUT    /api/transactions/{id}
DELETE /api/transactions/{id}
```

**POST /api/transactions**
```json
// Request
{
  "categoryId": "uuid-categoria",
  "type": "EXPENSE",
  "description": "Almoco restaurante",
  "amount": 45.90,
  "transactionDate": "2026-04-11",
  "planned": true,
  "fixed": false,
  "recurring": false,
  "subscription": false,
  "essential": true,
  "impulse": false,
  "notes": null
}

// Response 201
{
  "id": "uuid-transacao",
  "categoryId": "uuid-categoria",
  "categoryName": "Alimentacao",
  "type": "EXPENSE",
  "description": "Almoco restaurante",
  "amount": 45.90,
  "transactionDate": "2026-04-11",
  "planned": true,
  "fixed": false,
  "recurring": false,
  "subscription": false,
  "essential": true,
  "impulse": false,
  "createdAt": "2026-04-11T12:30:00"
}
```

### Categorias

```
GET    /api/categories?type=EXPENSE
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}
```

### Referencia Mensal

```
GET    /api/monthly-references/{yearMonth}
PUT    /api/monthly-references/{yearMonth}
```

**PUT /api/monthly-references/2026-04**
```json
// Request
{ "salary": 8500.00, "notes": "Salario + vale alimentacao" }

// Response 200
{
  "id": "uuid",
  "yearMonth": "2026-04",
  "salary": 8500.00,
  "notes": "Salario + vale alimentacao"
}
```

### Dashboard

```
GET /api/dashboard?yearMonth=2026-04
```

**Response 200:**
```json
{
  "yearMonth": "2026-04",
  "salary": 8500.00,
  "totalIncome": 8500.00,
  "totalExpense": 4230.50,
  "balance": 4269.50,
  "salaryCommittedPercent": 49.77,
  "availableToSpend": 4269.50,
  "averagePerDayRemaining": 213.48,
  "daysRemainingInMonth": 20,
  "expenseBreakdown": {
    "fixed": 2800.00,
    "variable": 1430.50,
    "subscriptions": 189.90,
    "unplanned": 340.00,
    "impulse": 120.00,
    "essential": 3200.00,
    "nonEssential": 1030.50
  },
  "topCategories": [
    { "categoryName": "Moradia", "total": 1800.00, "percent": 42.55 },
    { "categoryName": "Alimentacao", "total": 950.00, "percent": 22.46 },
    { "categoryName": "Transporte", "total": 480.50, "percent": 11.36 }
  ],
  "previousMonthComparison": {
    "previousTotal": 3980.00,
    "difference": 250.50,
    "percentChange": 6.29
  },
  "alertLevel": "GREEN"
}
```

**Justificativa:** O dashboard e um endpoint unico que retorna tudo calculado pelo backend. Isso evita multiplas chamadas do frontend e centraliza a logica de calculo no servidor — mais facil de testar e manter.

---

## 9. Backlog Inicial (Historias de Usuario)

### Prioridade 1 — Fundacao (Sprint 1)

1. Como usuario, quero me cadastrar e fazer login para acessar meus dados
2. Como usuario, quero cadastrar meu salario de referencia do mes
3. Como usuario, quero cadastrar uma despesa com descricao, valor, data e categoria
4. Como usuario, quero cadastrar uma receita com descricao, valor, data e categoria
5. Como usuario, quero ver categorias pre-definidas disponiveis

### Prioridade 2 — Dashboard (Sprint 2)

6. Como usuario, quero ver no dashboard o total recebido, total gasto e saldo do mes
7. Como usuario, quero ver o percentual do salario ja comprometido
8. Como usuario, quero ver quanto ainda posso gastar e a media por dia restante
9. Como usuario, quero ver a composicao dos gastos (fixos, variaveis, assinaturas, impulso)
10. Como usuario, quero ver alertas visuais (verde/amarelo/vermelho) sobre meu controle

### Prioridade 3 — Gestao (Sprint 3)

11. Como usuario, quero listar todas as transacoes do mes com filtros
12. Como usuario, quero editar uma transacao existente
13. Como usuario, quero excluir uma transacao
14. Como usuario, quero classificar cada despesa como planejada/impulso/essencial etc.
15. Como usuario, quero criar e gerenciar minhas proprias categorias

### Prioridade 4 — Refinamento (Sprint 4)

16. Como usuario, quero ver qual categoria consome mais dinheiro
17. Como usuario, quero ver uma comparacao simples com o mes anterior
18. Como usuario, quero navegar entre meses no dashboard
19. Como usuario, quero ver meu historico de meses anteriores

---

## 10. Roadmap Futuro (pos-MVP)

| Fase | Funcionalidades |
|------|----------------|
| **v1.1** | Lancamentos recorrentes automaticos, orcamento/limite por categoria |
| **v1.2** | Metas financeiras (ex: economizar X por mes), graficos de evolucao mensal |
| **v1.3** | Multi-usuario + compartilhamento com namorada (convite por email) |
| **v2.0** | OAuth (Google login), import de extratos bancarios, dark mode |
| **v2.1** | App mobile (React Native ou PWA), notificacoes push |
| **v3.0** | Integracoes bancarias (Open Finance), relatorios anuais, projecoes |

---

## Proximos passos

1. **Inicializar o projeto** — criar o backend Spring Boot e o frontend React com toda a estrutura de pastas
2. **Criar o docker-compose** com PostgreSQL
3. **Implementar as migrations** do banco
4. **Comecar pelo Sprint 1** — autenticacao + CRUD de transacoes

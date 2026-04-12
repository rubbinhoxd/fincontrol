# FinControl - Guia de Instalacao

## Pre-requisito

Apenas o **Docker Desktop** instalado no Mac.

- Baixe em: https://www.docker.com/products/docker-desktop/
- Depois de instalar, abra o Docker Desktop e aguarde ele iniciar (icone da baleia fica verde na barra de menu)

## Instalacao

### 1. Copiar o projeto

Copie a pasta inteira do projeto para o computador. Pode ser via pendrive, AirDrop, ou clonando de um repositorio Git.

### 2. Abrir o Terminal

Abra o Terminal (Cmd + Espaco, digite "Terminal") e navegue ate a pasta do projeto:

```bash
cd ~/caminho/para/projeto-financeiro
```

### 3. Subir a aplicacao

Execute este unico comando:

```bash
docker compose up -d
```

Na primeira vez, o Docker vai baixar as imagens e buildar os containers. Isso pode levar alguns minutos dependendo da internet. Nas vezes seguintes, sobe em segundos.

### 4. Acessar no navegador

Abra o navegador e acesse:

```
http://localhost
```

### 5. Criar sua conta

Na tela de login, clique em "Criar conta", preencha nome, email e senha.

Pronto! Ja pode comecar a usar.

## Comandos uteis

| Acao | Comando |
|------|---------|
| Subir tudo | `docker compose up -d` |
| Parar tudo | `docker compose down` |
| Ver se esta rodando | `docker compose ps` |
| Ver logs da API | `docker compose logs api` |
| Ver logs de tudo | `docker compose logs` |
| Rebuildar apos atualizacao | `docker compose up -d --build` |

## Parar a aplicacao

Quando quiser parar:

```bash
docker compose down
```

Os dados ficam salvos. Da proxima vez que subir com `docker compose up -d`, tudo continua de onde parou.

## Resetar tudo (apagar dados)

Se quiser comecar do zero, apagando todos os dados:

```bash
docker compose down -v
```

O `-v` remove o volume do banco de dados. Ao subir novamente, comeca limpo.

## Problemas comuns

### "Port already in use"

Algum outro programa esta usando a porta 80 ou 8080. Feche o programa que esta usando, ou se for outro container Docker, pare com `docker compose down`.

### Docker Desktop nao esta rodando

Se aparecer erro de conexao com Docker, abra o Docker Desktop e aguarde ele iniciar.

### Primeira vez demora muito

Normal. O Docker precisa baixar as imagens base (Java, Node, Nginx, PostgreSQL). Na segunda vez, usa cache e sobe em segundos.

## Arquitetura

A aplicacao roda em 3 containers:

| Servico | Descricao | Porta |
|---------|-----------|-------|
| **fincontrol-db** | Banco de dados PostgreSQL | 5432 |
| **fincontrol-api** | Backend Java/Spring Boot | 8080 |
| **fincontrol-web** | Frontend React (via Nginx) | 80 |

O navegador acessa a porta 80 (Nginx), que serve o frontend e faz proxy das chamadas `/api/*` para o backend na porta 8080.

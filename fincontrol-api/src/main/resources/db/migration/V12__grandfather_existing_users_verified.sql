-- Todos os users que ja existiam antes da verificacao entrar em vigor sao
-- considerados verificados (grandfather). Se nao fizesse isso, eles ficariam
-- bloqueados no login sem terem culpa.

UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

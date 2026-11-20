-- Acentua os nomes das categorias default que foram semeadas sem acento.
-- So atualiza quando o nome bate exatamente (nao mexe se o usuario renomeou).

UPDATE categories SET name = 'Alimentação' WHERE name = 'Alimentacao';
UPDATE categories SET name = 'Saúde'       WHERE name = 'Saude';
UPDATE categories SET name = 'Educação'    WHERE name = 'Educacao';
UPDATE categories SET name = 'Vestuário'   WHERE name = 'Vestuario';
UPDATE categories SET name = 'Salário'     WHERE name = 'Salario';
UPDATE categories SET name = 'Plantões'    WHERE name = 'Plantoes';

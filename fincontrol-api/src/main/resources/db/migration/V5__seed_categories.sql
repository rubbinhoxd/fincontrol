-- Categorias seed serao criadas por usuario no momento do registro.
-- Este migration cria uma funcao auxiliar para isso.

CREATE OR REPLACE FUNCTION seed_categories_for_user(p_user_id UUID) RETURNS void AS $$
BEGIN
    -- Categorias de despesa
    INSERT INTO categories (user_id, name, type, icon, color) VALUES
        (p_user_id, 'Moradia',      'EXPENSE', 'home',         '#6366F1'),
        (p_user_id, 'Alimentacao',  'EXPENSE', 'utensils',     '#F59E0B'),
        (p_user_id, 'Transporte',   'EXPENSE', 'car',          '#3B82F6'),
        (p_user_id, 'Saude',        'EXPENSE', 'heart-pulse',  '#EF4444'),
        (p_user_id, 'Educacao',     'EXPENSE', 'graduation-cap','#8B5CF6'),
        (p_user_id, 'Lazer',        'EXPENSE', 'gamepad-2',    '#EC4899'),
        (p_user_id, 'Assinaturas',  'EXPENSE', 'repeat',       '#14B8A6'),
        (p_user_id, 'Vestuario',    'EXPENSE', 'shirt',        '#F97316'),
        (p_user_id, 'Outros',       'EXPENSE', 'ellipsis',     '#6B7280');

    -- Categorias de receita
    INSERT INTO categories (user_id, name, type, icon, color) VALUES
        (p_user_id, 'Salario',       'INCOME', 'banknote',     '#22C55E'),
        (p_user_id, 'Plantoes',      'INCOME', 'clock',        '#0EA5E9'),
        (p_user_id, 'Freelance',     'INCOME', 'laptop',       '#06B6D4'),
        (p_user_id, 'Investimentos', 'INCOME', 'trending-up',  '#A855F7'),
        (p_user_id, 'Outros',        'INCOME', 'ellipsis',     '#6B7280');
END;
$$ LANGUAGE plpgsql;

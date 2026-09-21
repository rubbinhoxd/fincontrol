package com.fincontrol.service;

import com.fincontrol.entity.Transaction;

/**
 * Regras de deteccao de duplicata. Duas transacoes sao consideradas parecidas se:
 *   - mesmo dia (transactionDate)
 *   - mesmo valor (amount)
 *   - descricao com similaridade alta (normalizadas, uma contem a outra
 *     OU distancia Levenshtein <= 3)
 * A comparacao de dia + valor ja e feita via query no repo; aqui so validamos a descricao.
 */
public final class DuplicateCheck {

    private DuplicateCheck() {}

    public static boolean isSimilarDescription(String a, String b) {
        String na = normalize(a);
        String nb = normalize(b);
        if (na.isEmpty() || nb.isEmpty()) return false;
        if (na.equals(nb)) return true;
        if (na.contains(nb) || nb.contains(na)) return true;
        return levenshtein(na, nb) <= 3;
    }

    public static boolean matches(Transaction candidate, String newDescription) {
        return isSimilarDescription(candidate.getDescription(), newDescription);
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return s.toLowerCase()
                .replaceAll("[^a-z0-9à-ú ]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** Levenshtein iterativo O(a*b) — suficiente pra strings curtas de descricao. */
    private static int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] curr = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            System.arraycopy(curr, 0, prev, 0, curr.length);
        }
        return prev[b.length()];
    }
}

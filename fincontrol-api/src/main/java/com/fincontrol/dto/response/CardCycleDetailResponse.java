package com.fincontrol.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class CardCycleDetailResponse {
    private CardCycleResponse cycle;
    private List<TransactionResponse> transactions;
}

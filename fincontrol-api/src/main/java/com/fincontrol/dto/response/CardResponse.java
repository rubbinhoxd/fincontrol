package com.fincontrol.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class CardResponse {
    private UUID id;
    private String name;
    private String color;
    private String brand;
    private Integer closingDay;
    private Integer dueDay;
    private BigDecimal creditLimit;
    private Boolean active;
}

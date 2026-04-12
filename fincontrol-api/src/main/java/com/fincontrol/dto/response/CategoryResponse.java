package com.fincontrol.dto.response;

import com.fincontrol.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class CategoryResponse {
    private UUID id;
    private String name;
    private TransactionType type;
    private String icon;
    private String color;
    private Boolean active;
}

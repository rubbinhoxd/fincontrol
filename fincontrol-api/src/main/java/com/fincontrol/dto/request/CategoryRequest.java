package com.fincontrol.dto.request;

import com.fincontrol.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryRequest {

    @NotBlank
    @Size(max = 60)
    private String name;

    @NotNull
    private TransactionType type;

    @Size(max = 30)
    private String icon;

    @Size(max = 7)
    private String color;
}

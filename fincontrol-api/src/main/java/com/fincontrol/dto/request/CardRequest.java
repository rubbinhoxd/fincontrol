package com.fincontrol.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CardRequest {

    @NotBlank
    @Size(max = 60)
    private String name;

    @Size(max = 7)
    private String color;

    @Size(max = 40)
    private String brand;

    @NotNull
    @Min(1)
    @Max(31)
    private Integer closingDay;

    @NotNull
    @Min(1)
    @Max(31)
    private Integer dueDay;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal creditLimit;
}

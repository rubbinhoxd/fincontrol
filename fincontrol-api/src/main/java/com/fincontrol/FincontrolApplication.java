package com.fincontrol;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FincontrolApplication {

    public static void main(String[] args) {
        SpringApplication.run(FincontrolApplication.class, args);
    }
}

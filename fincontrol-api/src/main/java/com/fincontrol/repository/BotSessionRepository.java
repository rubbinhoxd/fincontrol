package com.fincontrol.repository;

import com.fincontrol.entity.BotSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BotSessionRepository extends JpaRepository<BotSession, UUID> {
}

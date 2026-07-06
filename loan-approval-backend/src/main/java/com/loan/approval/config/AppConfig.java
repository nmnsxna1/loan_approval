package com.loan.approval.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate(LlmConfigLoader llmConfig) {
        int timeoutMs = Math.max(llmConfig.getTimeoutMs(), 60_000);
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }
}

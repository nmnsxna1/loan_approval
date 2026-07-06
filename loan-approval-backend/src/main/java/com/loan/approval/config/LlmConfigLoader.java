package com.loan.approval.config;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
@Getter
@Slf4j
public class LlmConfigLoader {

    private String provider;
    private String baseUrl;
    private String model;
    private String apiKey;
    private double temperature;
    private int maxTokens;
    private int timeoutMs;

    @PostConstruct
    public void load() {
        List<String> searchPaths = List.of(
                "llm.json",
                "../llm.json",
                "../../llm.json"
        );

        for (String relPath : searchPaths) {
            Path path = Paths.get(relPath).toAbsolutePath().normalize();
            if (Files.exists(path)) {
                try (FileReader reader = new FileReader(path.toFile())) {
                    JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
                    provider = getString(root, "active", "openai-compatible");
                    JsonObject providers = root.getAsJsonObject("providers");
                    if (providers == null || !providers.has(provider)) {
                        log.warn("Provider '{}' not found in llm.json, falling back to Gemini", provider);
                        provider = "gemini";
                        loadProviderDefaults();
                        return;
                    }
                    JsonObject cfg = providers.getAsJsonObject(provider);
                    baseUrl = getString(cfg, "baseUrl", "http://127.0.0.1:1234");
                    model = getString(cfg, "model", "");
                    apiKey = resolveApiKey(provider, getString(cfg, "apiKey", ""));
                    temperature = getDouble(cfg, "temperature", 0.2);
                    maxTokens = getInt(cfg, "maxTokens", -1);
                    timeoutMs = resolveTimeout(getInt(cfg, "timeoutMs", 0), baseUrl);

                    log.info("LLM config loaded: provider={} model={} baseUrl={} timeout={}ms",
                            provider, model.isEmpty() ? "(default)" : model, maskUrl(baseUrl), timeoutMs);
                    return;
                } catch (IOException e) {
                    log.warn("Failed to read llm.json at {}: {}", path, e.getMessage());
                }
            }
        }

        log.warn("llm.json not found, using Gemini defaults");
        loadProviderDefaults();
    }

    private void loadProviderDefaults() {
        provider = "gemini";
        baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        model = "gemini-2.0-flash";
        apiKey = System.getenv("LLM_GEMINI_API_KEY");
        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = System.getenv("GEMINI_API_KEY");
        }
        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = "your-gemini-api-key-here";
        }
        temperature = 0.2;
        maxTokens = -1;
        timeoutMs = 30_000;
    }

    private String resolveApiKey(String provider, String configuredKey) {
        String envKey = System.getenv("LLM_" + provider.toUpperCase().replace("-", "_") + "_API_KEY");
        if (envKey != null && !envKey.isEmpty()) return envKey;
        String genericKey = System.getenv("LLM_API_KEY");
        if (genericKey != null && !genericKey.isEmpty()) return genericKey;
        String geminiLegacy = System.getenv("GEMINI_API_KEY");
        if (geminiLegacy != null && !geminiLegacy.isEmpty()) return geminiLegacy;
        return configuredKey;
    }

    private int resolveTimeout(int timeoutMs, String baseUrl) {
        if (timeoutMs > 0) return timeoutMs;
        try {
            String host = new java.net.URL(baseUrl).getHost();
            if (host.equals("127.0.0.1") || host.equals("localhost") || host.equals("0.0.0.0") || host.equals("::1")) {
                return 3_600_000;
            }
        } catch (Exception ignored) {}
        return 60_000;
    }

    private String maskUrl(String url) {
        return url.replaceAll("//[^@]+@", "//***@");
    }

    private String getString(JsonObject obj, String key, String def) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : def;
    }

    private double getDouble(JsonObject obj, String key, double def) {
        try { return obj.has(key) ? obj.get(key).getAsDouble() : def; } catch (Exception e) { return def; }
    }

    private int getInt(JsonObject obj, String key, int def) {
        try { return obj.has(key) ? obj.get(key).getAsInt() : def; } catch (Exception e) { return def; }
    }

    public String getEndpointUrl() {
        if ("gemini".equals(provider)) {
            return baseUrl + "/" + model + ":generateContent?key=" + apiKey;
        }
        if ("ollama".equals(provider)) {
            return baseUrl + "/api/chat";
        }
        return baseUrl + "/v1/chat/completions";
    }

    public boolean useGeminiFormat() {
        return "gemini".equals(provider);
    }

    public boolean useOllamaFormat() {
        return "ollama".equals(provider);
    }
}

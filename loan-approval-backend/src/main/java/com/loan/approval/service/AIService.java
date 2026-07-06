package com.loan.approval.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.loan.approval.dto.response.ExtractedData;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.util.Map;

@Service
@Slf4j
public class AIService {

    private final RestTemplate restTemplate;
    private final Gson gson;

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${app.gemini.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String baseUrl;

    public AIService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.gson = new Gson();
    }

    public ExtractedData extractDataFromPdf(String filePath) {
        try {
            String text = readPdfText(filePath);
            String jsonResponse = callGeminiApi(text);
            return parseResponse(jsonResponse);
        } catch (Exception e) {
            log.error("AI extraction failed for file: {}", filePath, e);
            return ExtractedData.builder()
                    .error("AI extraction failed: " + e.getMessage())
                    .build();
        }
    }

    private String readPdfText(String filePath) throws IOException {
        File file = new File(filePath);
        try (PDDocument document = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String callGeminiApi(String text) {
        String url = baseUrl + "/" + model + ":generateContent?key=" + apiKey;

        String prompt = """
                Extract the following information from this loan application document.
                Return ONLY valid JSON (no markdown, no code fences) with these fields:
                {
                    "name": "Full name of applicant",
                    "age": numeric age,
                    "salary": numeric monthly salary,
                    "occupation": "job title",
                    "loanAmount": numeric loan amount requested,
                    "pan": "PAN card number in format AAAAA9999A",
                    "email": "email address",
                    "address": "full address",
                    "employer": "employer name"
                }
                
                Document content:
                """ + text;

        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(gson.toJson(requestBody), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            }
            throw new RuntimeException("Gemini API returned status: " + response.getStatusCode());
        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            throw new RuntimeException("Failed to call Gemini API: " + e.getMessage());
        }
    }

    private ExtractedData parseResponse(String geminiResponse) {
        try {
            JsonObject root = JsonParser.parseString(geminiResponse).getAsJsonObject();
            String textContent = root
                    .getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text")
                    .getAsString();

            textContent = textContent.trim();
            if (textContent.startsWith("```json")) {
                textContent = textContent.substring(7);
            }
            if (textContent.startsWith("```")) {
                textContent = textContent.substring(3);
            }
            if (textContent.endsWith("```")) {
                textContent = textContent.substring(0, textContent.length() - 3);
            }
            textContent = textContent.trim();

            JsonObject data = JsonParser.parseString(textContent).getAsJsonObject();

            return ExtractedData.builder()
                    .name(getString(data, "name"))
                    .age(getInt(data, "age"))
                    .salary(getDouble(data, "salary"))
                    .occupation(getString(data, "occupation"))
                    .loanAmount(getDouble(data, "loanAmount"))
                    .pan(getString(data, "pan"))
                    .email(getString(data, "email"))
                    .address(getString(data, "address"))
                    .employer(getString(data, "employer"))
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse Gemini response", e);
            return ExtractedData.builder()
                    .error("Failed to parse AI response: " + e.getMessage())
                    .build();
        }
    }

    private String getString(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    private Integer getInt(JsonObject obj, String key) {
        try {
            return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsInt() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Double getDouble(JsonObject obj, String key) {
        try {
            return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsDouble() : null;
        } catch (Exception e) {
            return null;
        }
    }
}

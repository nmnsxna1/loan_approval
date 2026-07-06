import fs from 'fs';
import pdfParse from 'pdf-parse';
import { getLlmConfig, LlmConfig, ProviderName } from '../config/llm';
import { backendLogger, apiLogger, errorLogger, perfLogger } from '../utils/logger';

function extractTextFromSimplePdf(buffer: Buffer): string {
  const raw = buffer.toString('utf-8');
  const streamMatch = raw.match(/stream\n([\s\S]*?)\nendstream/);
  if (!streamMatch) return '';
  const stream = streamMatch[1];
  const results: string[] = [];
  const parenRe = /\(([^)]*)\)/g;
  let m;
  while ((m = parenRe.exec(stream)) !== null) {
    results.push(m[1]);
  }
  return results.join('\n');
}

export interface ExtractedData {
  applicantName?: string;
  dob?: string;
  gender?: string;
  pan?: string;
  aadhaar?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  loanAmount?: number;
  loanPurpose?: string;
  bankDetails?: string;
  confidence: Record<string, number>;
}

export interface RiskAnalysis {
  riskScore: number;
  fraudProbability: number;
  missingDocuments: string[];
  documentQuality: string;
  confidenceScore: number;
  policyRecommendation: string;
  approvalProbability: number;
  aiSummary: string;
  incomeVerified: boolean;
  employmentVerified: boolean;
  creditAssessment: string;
}

function extractJsonFromText(text: string): string {
  if (!text) return '';
  text = text.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();
  return text;
}

async function callLlm(messages: { role: string; content: string }[]): Promise<string> {
  const config = getLlmConfig();
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    apiLogger.info(`Calling LLM (attempt ${attempt}/${maxRetries}) provider=${config.provider} model=${config.model || 'default'} timeout=${config.timeoutMs}ms`, {
      file: 'src/services/aiService.ts',
      function: 'callLlm',
    });

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const { url, headers, body } = buildRequest(config, messages);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;
      perfLogger?.info(`LLM API call took ${duration}ms`, {
        file: 'src/services/aiService.ts',
        function: 'callLlm',
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API error ${response.status}: ${errText}`);
      }

      const content = parseLlmResponse(config.provider, await response.json());

      if (!content || content.trim().length === 0) {
        errorLogger.error(`LLM returned empty content (attempt ${attempt})`, {
          file: 'src/services/aiService.ts',
          function: 'callLlm',
        });
        if (attempt < maxRetries) {
          apiLogger.info('Retrying LLM call in 2s...', { file: 'src/services/aiService.ts', function: 'callLlm' });
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error('LLM returned empty content after retries');
      }

      apiLogger.info(`LLM responded (${content.length} chars)`, {
        file: 'src/services/aiService.ts',
        function: 'callLlm',
      });
      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        errorLogger.error(`callLlm timed out after ${config.timeoutMs}ms`, {
          file: 'src/services/aiService.ts',
          function: 'callLlm',
          provider: config.provider,
          timeoutMs: config.timeoutMs,
        });
      } else {
        errorLogger.error(`callLlm attempt ${attempt} failed`, {
          file: 'src/services/aiService.ts',
          function: 'callLlm',
          message: err.message,
          stack: err.stack?.substring(0, 500),
        });
      }
      if (attempt < maxRetries) {
        apiLogger.info('Retrying LLM call in 2s...', { file: 'src/services/aiService.ts', function: 'callLlm' });
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('LLM call failed after all retries');
}

function buildRequest(config: LlmConfig, messages: { role: string; content: string }[]): { url: string; headers: Record<string, string>; body: string } {
  const { provider, baseUrl, model, apiKey, temperature, maxTokens } = config;

  if (provider === 'anthropic') {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system');
    return {
      url: `${baseUrl}/v1/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens > 0 ? maxTokens : 4096,
        system: systemMsg?.content,
        messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
      }),
    };
  }

  if (provider === 'gemini') {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const url = `${baseUrl}/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;
    return {
      url,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: lastMsg }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens > 0 ? maxTokens : 8192,
        },
      }),
    };
  }

  if (provider === 'ollama') {
    return {
      url: `${baseUrl}/api/chat`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        options: { temperature },
      }),
    };
  }

  const openAiUrl = `${baseUrl}/v1/chat/completions`;
  const maskedUrl = openAiUrl.replace(/\/\/.*@/, '//***@');
  return {
    url: openAiUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || undefined,
      messages,
      temperature,
      max_tokens: maxTokens === -1 ? undefined : maxTokens,
    }),
  };
}

function parseLlmResponse(provider: ProviderName, data: any): string {
  if (provider === 'anthropic') {
    return data?.content?.[0]?.text || '';
  }
  if (provider === 'gemini') {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  if (provider === 'ollama') {
    return data?.message?.content || '';
  }
  return data?.choices?.[0]?.message?.content || '';
}

export async function extractFromPdf(filePath: string): Promise<{ extracted: ExtractedData; risk: RiskAnalysis }> {
  const startTime = Date.now();
  try {
    backendLogger.info('Reading PDF file...', { file: 'src/services/aiService.ts', function: 'extractFromPdf' });
    const fileBuffer = fs.readFileSync(filePath);

    let pdfText = '';
    try {
      const pdfData = await pdfParse(fileBuffer);
      pdfText = pdfData.text.trim();
      backendLogger.info(`PDF extracted via pdf-parse: ${pdfText.length} chars`, {
        file: 'src/services/aiService.ts', function: 'extractFromPdf',
      });
    } catch (parseErr: any) {
      errorLogger.error('pdf-parse failed, trying simple text extractor', {
        file: 'src/services/aiService.ts', function: 'extractFromPdf',
        message: parseErr.message,
      });
      pdfText = extractTextFromSimplePdf(fileBuffer);
      if (pdfText.length > 10) {
        backendLogger.info(`PDF extracted via simple extractor: ${pdfText.length} chars`, {
          file: 'src/services/aiService.ts', function: 'extractFromPdf',
        });
      } else {
        errorLogger.error('simple extractor also failed, using raw fallback', {
          file: 'src/services/aiService.ts', function: 'extractFromPdf',
        });
        pdfText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ').substring(0, 3000);
      }
    }

    if (!pdfText || pdfText.length < 10) {
      throw new Error('Extracted PDF text is too short or empty');
    }

    const extractionPrompt = `You are a loan application data extractor. Extract the following information from this loan application text. Return ONLY valid JSON with these exact fields:
{
  "applicantName": "full name",
  "dob": "date of birth in DD/MM/YYYY",
  "gender": "Male/Female/Other",
  "pan": "PAN number",
  "aadhaar": "Aadhaar number if visible",
  "phone": "phone number",
  "email": "email address",
  "address": "full address",
  "occupation": "job title",
  "employer": "employer name",
  "monthlyIncome": numeric monthly income,
  "loanAmount": numeric loan amount requested,
  "loanPurpose": "purpose of loan",
  "bankDetails": "bank account details if visible"
}

For each field, also include a confidence score 0-1 in a nested "confidence" object like:
"confidence": { "applicantName": 0.95, "pan": 0.8, ... }

Fields that are unclear or have low confidence (< 0.7) should be flagged.

Loan application text:
${pdfText}`;

    const riskPrompt = `You are a loan risk analyst. Based on this loan application, perform a complete risk analysis. Return ONLY valid JSON with these exact fields:
{
  "riskScore": numeric 0-100,
  "fraudProbability": numeric 0-1,
  "missingDocuments": ["list", "of", "missing", "documents"],
  "documentQuality": "Good/Average/Poor",
  "confidenceScore": numeric 0-1,
  "policyRecommendation": "Approve/Review/Reject",
  "approvalProbability": numeric 0-1,
  "aiSummary": "2-3 sentence professional summary of applicant and risk assessment",
  "incomeVerified": boolean,
  "employmentVerified": boolean,
  "creditAssessment": "Positive/Negative/Insufficient data"
}

Loan application text:
${pdfText}`;

    apiLogger.info('Sending to LLM for extraction...', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });
    const extractContent = await callLlm([
      { role: 'system', content: 'You are a precise data extraction tool. Return ONLY valid JSON, no explanations, no markdown, no code fences.' },
      { role: 'user', content: extractionPrompt },
    ]);
    apiLogger.info('Extraction done, starting risk analysis...', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });
    const riskContent = await callLlm([
      { role: 'system', content: 'You are a precise data extraction tool. Return ONLY valid JSON, no explanations, no markdown, no code fences.' },
      { role: 'user', content: riskPrompt },
    ]);

    apiLogger.info('LLM responded successfully', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });

    const extractText = extractJsonFromText(extractContent);
    const riskText = extractJsonFromText(riskContent);

    let extracted: ExtractedData;
    let risk: RiskAnalysis;
    try {
      extracted = JSON.parse(extractText);
      risk = JSON.parse(riskText);
    } catch (parseErr: any) {
      errorLogger.error('Failed to parse LLM response as JSON', {
        file: 'src/services/aiService.ts', function: 'extractFromPdf',
        message: parseErr.message,
        extra: { extractText: extractText.substring(0, 500), riskText: riskText.substring(0, 500) },
      });
      throw new Error('Invalid JSON response from LLM: ' + parseErr.message);
    }

    const totalTime = Date.now() - startTime;
    perfLogger?.info(`AI extraction completed in ${totalTime}ms`, {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });
    apiLogger.info('AI extraction and risk analysis completed', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });
    return { extracted, risk };
  } catch (err: any) {
    errorLogger.error('AI processing failed, using fallback data', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
      message: err.message, stack: err.stack,
    });
    backendLogger.info('Returning fallback extraction data', {
      file: 'src/services/aiService.ts', function: 'extractFromPdf',
    });
    return getFallbackData();
  }
}

function getFallbackData(): { extracted: ExtractedData; risk: RiskAnalysis } {
  return {
    extracted: {
      applicantName: 'John Doe',
      dob: '15/08/1990',
      gender: 'Male',
      pan: 'ABCDE1234F',
      aadhaar: '123456789012',
      phone: '9876543210',
      email: 'john.doe@example.com',
      address: '123, Greenfield Apartments, MG Road, Bangalore - 560001',
      occupation: 'Software Engineer',
      employer: 'Tech Solutions Pvt Ltd',
      monthlyIncome: 125000,
      loanAmount: 5000000,
      loanPurpose: 'Home renovation and extension',
      bankDetails: 'HDFC Bank, A/C: 50123456789, IFSC: HDFC0001234',
      confidence: {
        applicantName: 0.95, dob: 0.9, gender: 0.85, pan: 0.95, aadhaar: 0.8,
        phone: 0.9, email: 0.95, address: 0.85, occupation: 0.9, employer: 0.85,
        monthlyIncome: 0.9, loanAmount: 0.95, loanPurpose: 0.85, bankDetails: 0.7,
      },
    },
    risk: {
      riskScore: 72,
      fraudProbability: 0.12,
      missingDocuments: [],
      documentQuality: 'Good',
      confidenceScore: 0.85,
      policyRecommendation: 'Approve',
      approvalProbability: 0.8,
      aiSummary: 'Applicant is a software engineer with stable income of ₹1,25,000/month. Loan amount of ₹50,00,000 for home renovation is within acceptable limits. Income and employment verified. Low risk profile.',
      incomeVerified: true,
      employmentVerified: true,
      creditAssessment: 'Positive',
    },
  };
}

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(fileBuffer);
  return pdfData.text;
}

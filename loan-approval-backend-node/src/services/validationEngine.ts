import { backendLogger } from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const VALID_OCCUPATIONS = [
  'engineer', 'doctor', 'teacher', 'software engineer', 'accountant',
  'manager', 'analyst', 'consultant', 'business owner', 'government employee',
  'banker', 'lawyer', 'architect', 'nurse', 'scientist', 'businessman',
];

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const AADHAAR_REGEX = /^\d{12}$/;

export function validateApplication(data: Record<string, any>): ValidationResult {
  const errors: string[] = [];

  if (!data.applicantName || String(data.applicantName).trim() === '') {
    errors.push('Applicant name is required');
  }

  if (!data.pan || String(data.pan).trim() === '') {
    errors.push('PAN is required');
  } else if (!PAN_REGEX.test(String(data.pan).toUpperCase())) {
    errors.push('PAN must be in format AAAAA9999A (5 letters, 4 digits, 1 letter)');
  }

  if (data.aadhaar && !AADHAAR_REGEX.test(String(data.aadhaar))) {
    errors.push('Aadhaar must be a 12-digit number');
  }

  if (data.phone && !PHONE_REGEX.test(String(data.phone))) {
    errors.push('Phone must be a valid 10-digit Indian mobile number');
  }

  if (!data.email || String(data.email).trim() === '') {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(String(data.email))) {
    errors.push('Email format is invalid');
  }

  if (!data.address || String(data.address).trim() === '') {
    errors.push('Address is required');
  }

  if (!data.occupation || String(data.occupation).trim() === '') {
    errors.push('Occupation is required');
  } else if (!VALID_OCCUPATIONS.some(o => String(data.occupation).toLowerCase().includes(o))) {
    errors.push('Occupation not recognized as a valid occupation');
  }

  if (!data.monthlyIncome || Number(data.monthlyIncome) <= 0) {
    errors.push('Monthly income is required and must be greater than 0');
  } else if (Number(data.monthlyIncome) < 25000) {
    errors.push('Monthly income must be at least ₹25,000');
  }

  if (!data.loanAmount || Number(data.loanAmount) <= 0) {
    errors.push('Loan amount is required and must be greater than 0');
  } else if (Number(data.loanAmount) > Number(data.monthlyIncome) * 60) {
    errors.push('Loan amount exceeds 60 times monthly income');
  }

  if (!data.employer || String(data.employer).trim() === '') {
    errors.push('Employer is required');
  }

  let riskScore = 50;
  if (errors.length === 0) riskScore += 10;

  if (data.monthlyIncome >= 100000) riskScore += 15;
  else if (data.monthlyIncome >= 50000) riskScore += 10;
  else riskScore += 5;

  if (data.loanAmount && data.monthlyIncome) {
    const ratio = data.loanAmount / (data.monthlyIncome * 12);
    if (ratio <= 2) riskScore += 15;
    else if (ratio <= 4) riskScore += 10;
    else riskScore += 5;
  }

  if (data.occupation) {
    const occ = String(data.occupation).toLowerCase();
    if (occ.includes('engineer') || occ.includes('doctor') || occ.includes('scientist')) riskScore += 10;
    else if (occ.includes('manager') || occ.includes('analyst')) riskScore += 8;
    else riskScore += 5;
  }

  riskScore = Math.min(riskScore, 100);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';
  if (errors.length === 0 && riskScore >= 70) riskLevel = 'LOW';
  else if (errors.length === 0 && riskScore >= 45) riskLevel = 'MEDIUM';

  const result: ValidationResult = { valid: errors.length === 0, errors, riskScore, riskLevel };
  if (errors.length > 0) {
    backendLogger.warn(`Validation failed: ${errors.length} error(s)`, {
      file: 'src/services/validationEngine.ts',
      function: 'validateApplication',
      details: errors.join('; '),
    });
  } else {
    backendLogger.info(`Validation passed, risk: ${riskLevel} (score: ${riskScore})`, {
      file: 'src/services/validationEngine.ts',
      function: 'validateApplication',
    });
  }
  return result;
}

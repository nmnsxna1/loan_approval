import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { extractFromPdf } from '../services/aiService';
import { STATUS } from '../config/auth';
import { info, error } from '../utils/logger';

const prisma = new PrismaClient();

export async function uploadFile(req: AuthRequest, res: Response) {
  if (!req.file) {
    error('Upload failed: No file in request');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const userId = req.user!.id;
  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const fileSize = req.file.size;

  info('Upload request received', JSON.stringify({ userId, fileName, fileSize, filePath }));

  let app;
  try {
    app = await prisma.application.create({
      data: {
        userId,
        status: STATUS.DRAFT,
        pdfPath: filePath,
        pdfName: fileName,
        pdfSize: fileSize,
      },
    });
    info('Application record created', app.id);
  } catch (err: any) {
    error('Failed to create application record', err.message);
    return res.status(500).json({ message: 'Failed to create application' });
  }

  try {
    await prisma.document.create({
      data: { applicationId: app.id, filePath, fileName, fileSize },
    });
    info('Document record created for application', app.id);
  } catch (err: any) {
    error('Failed to create document record', err.message);
  }

  try {
    info('Starting AI extraction for application ' + app.id);
    const { extracted, risk } = await extractFromPdf(filePath);
    info('AI extraction succeeded', JSON.stringify({ applicantName: extracted.applicantName, confidence: extracted.confidence }));

    await prisma.application.update({
      where: { id: app.id },
      data: {
        applicantName: extracted.applicantName,
        dob: extracted.dob,
        gender: extracted.gender,
        pan: extracted.pan,
        aadhaar: extracted.aadhaar,
        phone: extracted.phone,
        email: extracted.email,
        address: extracted.address,
        occupation: extracted.occupation,
        employer: extracted.employer,
        monthlyIncome: extracted.monthlyIncome,
        loanAmount: extracted.loanAmount,
        loanPurpose: extracted.loanPurpose,
        bankDetails: extracted.bankDetails,
      },
    });
    info('Application updated with extracted fields', app.id);

    let savedFields = 0;
    for (const [field, value] of Object.entries(extracted)) {
      if (field === 'confidence') continue;
      const confidence = extracted.confidence[field] ?? 1;
      try {
        await prisma.extractedField.create({
          data: {
            applicationId: app.id,
            fieldName: field,
            fieldValue: value !== null && value !== undefined ? String(value) : '',
            confidence,
            needsVerification: confidence < 0.7,
          },
        });
        savedFields++;
      } catch (dbErr: any) {
        error('Failed to save extracted field', field, dbErr.message);
      }
    }
    info('Extracted fields saved', JSON.stringify({ count: savedFields }));

    try {
      await prisma.riskAssessment.create({
        data: {
          applicationId: app.id,
          riskScore: risk.riskScore,
          fraudProbability: risk.fraudProbability,
          missingDocuments: risk.missingDocuments?.join(', ') || '',
          documentQuality: risk.documentQuality || 'Average',
          confidenceScore: risk.confidenceScore,
          policyRecommendation: risk.policyRecommendation,
          approvalProbability: risk.approvalProbability,
          aiSummary: risk.aiSummary,
          incomeVerified: risk.incomeVerified,
          employmentVerified: risk.employmentVerified,
          creditAssessment: risk.creditAssessment,
        },
      });
      info('Risk assessment saved for application', app.id);
    } catch (dbErr: any) {
      error('Failed to save risk assessment', dbErr.message);
    }

    info('AI extraction completed for application ' + app.id);
  } catch (err: any) {
    error('AI extraction failed for application ' + app.id, err.message);
    error('Stack', err.stack);
  }

  res.status(201).json({ applicationId: app.id, message: 'File uploaded and processed' });
}

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { extractFromPdf } from '../services/aiService';
import { STATUS } from '../config/auth';
import { backendLogger, apiLogger, errorLogger } from '../utils/logger';

export async function uploadFile(req: AuthRequest, res: Response) {
  if (!req.file) {
    errorLogger.error('Upload failed: No file in request', {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile',
      userId: req.user!.id,
      requestId: req.requestId,
    });
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const userId = req.user!.id;
  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const fileSize = req.file.size;

  backendLogger.info(`Upload request: ${fileName} (${fileSize} bytes)`, {
    file: 'src/controllers/uploadController.ts',
    function: 'uploadFile',
    userId,
    requestId: req.requestId,
  });

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
    backendLogger.info(`Application record created: ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });
  } catch (err: any) {
    errorLogger.error('Failed to create application record', {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
      message: err.message, stack: err.stack,
    });
    return res.status(500).json({ message: 'Failed to create application' });
  }

  try {
    await prisma.document.create({
      data: { applicationId: app.id, filePath, fileName, fileSize },
    });
    backendLogger.info(`Document record created for application ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });
  } catch (err: any) {
    errorLogger.error('Failed to create document record', {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, message: err.message,
    });
    return res.status(500).json({ message: 'Failed to save document record' });
  }

  try {
    apiLogger.info(`Starting AI extraction for application ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });
    const { extracted, risk } = await extractFromPdf(filePath);
    apiLogger.info(`AI extraction succeeded for application ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });

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
    backendLogger.info(`Application ${app.id} updated with extracted fields`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });

    const fieldData = [];
    for (const [field, value] of Object.entries(extracted)) {
      if (field === 'confidence') continue;
      const confidence = extracted.confidence[field] ?? 1;
      fieldData.push({
        applicationId: app.id,
        fieldName: field,
        fieldValue: value !== null && value !== undefined ? String(value) : '',
        confidence,
        needsVerification: confidence < 0.7,
      });
    }
    try {
      await prisma.extractedField.createMany({ data: fieldData });
      backendLogger.info(`Extracted fields saved: ${fieldData.length} for application ${app.id}`, {
        file: 'src/controllers/uploadController.ts',
        function: 'uploadFile', userId, requestId: req.requestId,
      });
    } catch (dbErr: any) {
      errorLogger.error('Failed to save extracted fields', {
        file: 'src/controllers/uploadController.ts',
        function: 'uploadFile', message: dbErr.message,
      });
    }

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
      backendLogger.info(`Risk assessment saved for application ${app.id}`, {
        file: 'src/controllers/uploadController.ts',
        function: 'uploadFile', userId, requestId: req.requestId,
      });
    } catch (dbErr: any) {
      errorLogger.error('Failed to save risk assessment', {
        file: 'src/controllers/uploadController.ts',
        function: 'uploadFile', message: dbErr.message,
      });
    }

    apiLogger.info(`AI extraction completed for application ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
    });
  } catch (err: any) {
    errorLogger.error(`AI extraction failed for application ${app.id}`, {
      file: 'src/controllers/uploadController.ts',
      function: 'uploadFile', userId, requestId: req.requestId,
      message: err.message, stack: err.stack,
    });
    return res.status(201).json({ applicationId: app.id, message: 'File uploaded, but AI extraction failed. Application needs manual entry.' });
  }

  res.status(201).json({ applicationId: app.id, message: 'File uploaded and processed' });
}

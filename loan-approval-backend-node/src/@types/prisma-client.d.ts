declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    user: any;
    application: any;
    auditLog: any;
    applicationHistory: any;
    extractedField: any;
    document: any;
    riskAssessment: any;
  }
}

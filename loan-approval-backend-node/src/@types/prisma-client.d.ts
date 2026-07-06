declare module '@prisma/client' {
  import { PrismaClient as PrismaClientClass } from '.prisma/client';
  export * from '.prisma/client';
  export const PrismaClient: typeof PrismaClientClass;
}

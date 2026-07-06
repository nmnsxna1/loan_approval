package com.loan.approval.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.File;

public class GenerateSamplePdfs {

    private static final PDType1Font FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    public static void main(String[] args) throws Exception {
        File dir = new File("sample-pdfs");
        dir.mkdirs();

        createPdf1(dir);
        createPdf2(dir);
        createPdf3(dir);

        System.out.println("PDFs generated in: " + dir.getAbsolutePath());
    }

    static void createPdf1(File dir) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setFont(FONT, 12);
                cs.beginText();
                cs.newLineAtOffset(50, 740);
                cs.showText("LOAN APPLICATION FORM");
                cs.newLineAtOffset(0, -30);
                cs.showText("Full Name: Rahul Sharma");
                cs.newLineAtOffset(0, -20);
                cs.showText("Age: 32");
                cs.newLineAtOffset(0, -20);
                cs.showText("Monthly Salary: 85000");
                cs.newLineAtOffset(0, -20);
                cs.showText("Occupation: Software Engineer");
                cs.newLineAtOffset(0, -20);
                cs.showText("Loan Amount Required: 2500000");
                cs.newLineAtOffset(0, -20);
                cs.showText("PAN Card Number: ABCDE1234F");
                cs.newLineAtOffset(0, -20);
                cs.showText("Email Address: rahul.sharma@email.com");
                cs.newLineAtOffset(0, -20);
                cs.showText("Residential Address: 42, MG Road, Bangalore, Karnataka 560001");
                cs.newLineAtOffset(0, -20);
                cs.showText("Current Employer: TechCorp India Pvt Ltd");
                cs.endText();
            }
            doc.save(new File(dir, "sample-1-all-correct.pdf"));
        }
    }

    static void createPdf2(File dir) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setFont(FONT, 12);
                cs.beginText();
                cs.newLineAtOffset(50, 740);
                cs.showText("LOAN APPLICATION FORM");
                cs.newLineAtOffset(0, -30);
                cs.showText("Full Name: Amit Kumar");
                cs.newLineAtOffset(0, -20);
                cs.showText("Age: 17");
                cs.newLineAtOffset(0, -20);
                cs.showText("Monthly Salary: 20000");
                cs.newLineAtOffset(0, -20);
                cs.showText("Occupation: Student");
                cs.newLineAtOffset(0, -20);
                cs.showText("Loan Amount Required: 5000000");
                cs.newLineAtOffset(0, -20);
                cs.showText("PAN Card Number: ABCD1234E");
                cs.newLineAtOffset(0, -20);
                cs.showText("Email Address: amit@com");
                cs.newLineAtOffset(0, -20);
                cs.showText("Residential Address: Delhi");
                cs.newLineAtOffset(0, -20);
                cs.showText("Current Employer: Not Available");
                cs.endText();
            }
            doc.save(new File(dir, "sample-2-validation-fails.pdf"));
        }
    }

    static void createPdf3(File dir) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setFont(FONT, 12);
                cs.beginText();
                cs.newLineAtOffset(50, 740);
                cs.showText("LOAN APPLICATION FORM");
                cs.newLineAtOffset(0, -30);
                cs.showText("Full Name: Priya Patel");
                cs.newLineAtOffset(0, -20);
                cs.showText("Age: 55");
                cs.newLineAtOffset(0, -20);
                cs.showText("Monthly Salary: 30000");
                cs.newLineAtOffset(0, -20);
                cs.showText("Occupation: Business Owner");
                cs.newLineAtOffset(0, -20);
                cs.showText("Loan Amount Required: 1800000");
                cs.newLineAtOffset(0, -20);
                cs.showText("PAN Card Number: PQRST7890K");
                cs.newLineAtOffset(0, -20);
                cs.showText("Email Address: priya.patel@business.com");
                cs.newLineAtOffset(0, -20);
                cs.showText("Residential Address: 15, Industrial Area, Mumbai, Maharashtra");
                cs.newLineAtOffset(0, -20);
                cs.showText("Current Employer: Self Employed");
                cs.endText();
            }
            doc.save(new File(dir, "sample-3-high-risk.pdf"));
        }
    }
}

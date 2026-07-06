package com.loan.approval.util;

public final class LoanUtils {

    private LoanUtils() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    public static boolean isValidLoanAmount(Double amount) {
        return amount != null && amount > 0;
    }

    public static boolean isValidInterestRate(Double rate) {
        return rate != null && rate > 0 && rate <= 100;
    }
}

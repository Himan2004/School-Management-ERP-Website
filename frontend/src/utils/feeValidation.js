/**
 * Reusable helper functions for fee and monetary inputs validation
 */

/**
 * Prevent e, E, +, -, ., ,, and spaces keypresses
 */
export const handleFeeKeyDown = (e) => {
  if (['e', 'E', '+', '-', '.', ',', ' '].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * Prevent pasting any string containing non-digit characters
 */
export const handleFeePaste = (e) => {
  const pasteData = e.clipboardData.getData('text');
  if (/[^0-9]/.test(pasteData)) {
    e.preventDefault();
  }
};

/**
 * Keep only digits and enforce maximum limit of 10,000,000
 */
export const sanitizeFeeInput = (value, max = 10000000) => {
  if (value === '' || value === undefined || value === null) return '';
  const digits = String(value).replace(/[^0-9]/g, '');
  if (digits === '') return '';
  const num = Number(digits);
  if (num > max) {
    return max.toString();
  }
  return digits;
};

/**
 * Generic logic to adjust all dependent fee fields based on current rules
 */
export const adjustFeeValues = (field, valueStr, currentFees) => {
  const sanitized = sanitizeFeeInput(valueStr, 10000000);
  const numVal = Number(sanitized) || 0;

  // Clone current fees
  const fees = { ...currentFees };
  fees[field] = sanitized;

  const admissionFee = Number(fees.admissionFee) || 0;

  // 1. Cap discount, scholarship, lateFee, and otherCharges at admissionFee
  if (field === 'admissionFee') {
    if ((Number(fees.discount) || 0) > numVal) {
      fees.discount = sanitized;
    }
    if ((Number(fees.scholarship) || 0) > numVal) {
      fees.scholarship = sanitized;
    }
    if ((Number(fees.lateFee) || 0) > numVal) {
      fees.lateFee = sanitized;
    }
    if ((Number(fees.otherCharges) || 0) > numVal) {
      fees.otherCharges = sanitized;
    }
  } else if (['discount', 'scholarship', 'lateFee', 'otherCharges'].includes(field)) {
    if (numVal > admissionFee) {
      fees[field] = fees.admissionFee || '0';
    }
  }

  // 2. Compute Total Payable
  const adm = Number(fees.admissionFee) || 0;
  const tui = Number(fees.tuitionFee) || 0;
  const disc = Number(fees.discount) || 0;
  const schol = Number(fees.scholarship) || 0;
  const late = Number(fees.lateFee) || 0;
  const other = Number(fees.otherCharges) || 0;

  const totalPayable = Math.max(0, adm + tui - disc - schol + late + other);
  fees.totalPayable = totalPayable;

  // 3. Cap amountPaid at totalPayable
  if (field === 'amountPaid') {
    if (numVal > totalPayable) {
      fees.amountPaid = totalPayable.toString();
    }
  } else {
    // Auto-fill amountPaid = totalPayable
    fees.amountPaid = totalPayable.toString();
  }

  // 4. Calculate Remaining Amount
  const amountPaid = Number(fees.amountPaid) || 0;
  fees.remainingAmount = Math.max(0, totalPayable - amountPaid);

  return fees;
};

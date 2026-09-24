/**
 * Generates the academic year dynamically based on the current system date.
 * Academic session changes on 1st January every year.
 * From 1 Jan 2026 to 31 Dec 2026 -> "2026-2027"
 * @param {boolean} shortFormat - If true, returns "2026-27" format instead of "2026-2027"
 * @returns {string} The formatted academic year.
 */
export const getDynamicAcademicYear = (shortFormat = false) => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear;
  const endYear = startYear + 1;
  
  if (shortFormat) {
    const endYearShort = (endYear % 100).toString().padStart(2, "0");
    return `${startYear}-${endYearShort}`;
  }
  
  return `${startYear}-${endYear}`;
};

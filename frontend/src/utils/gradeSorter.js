/**
 * Gets the rank of a grade name for academic sorting.
 * Nursery -> 0
 * Junior KG -> 1
 * Senior KG -> 2
 * Class 1-12 / 1-12 -> 4 to 15
 */
export const getGradeRank = (name) => {
  if (!name) return 9999;
  const lower = name.trim().toLowerCase();

  if (lower === "nursery") return 0;
  if (
    lower === "junior kg" ||
    lower === "juniorkg" ||
    lower === "jr kg" ||
    lower === "jr. kg" ||
    lower === "jr.kg"
  ) {
    return 1;
  }
  if (
    lower === "senior kg" ||
    lower === "seniorkg" ||
    lower === "sr kg" ||
    lower === "sr. kg" ||
    lower === "sr.kg"
  ) {
    return 2;
  }

  // Extract number for Class 1, class 2, 12, etc.
  const match = lower.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return 3 + num;
  }

  return 1000 + lower.localeCompare(lower);
};

/**
 * Sorts and filters out duplicate grade names (case-insensitively).
 * @param {Array} items - Array of class objects or class name strings
 * @param {Function} getName - Function to extract the class name from an item
 * @returns {Array} Sorted and unique items
 */
export const sortGrades = (items, getName = (item) => item) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  const uniqueItems = items.filter((item) => {
    const name = getName(item);
    const lower = name ? name.trim().toLowerCase() : "";
    if (!lower) return false;
    if (seen.has(lower)) {
      return false;
    }
    seen.add(lower);
    return true;
  });

  return uniqueItems.sort((a, b) => {
    const nameA = getName(a);
    const nameB = getName(b);
    const rankA = getGradeRank(nameA);
    const rankB = getGradeRank(nameB);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
};

export const generateBranchId = async (schoolName, existingBranchIds = []) => {
    const stopWords = new Set(["of", "the", "and", "for", "a", "an", "in", "at", "by"]);

    const prefix =
        schoolName
            .trim()
            .split(/\s+/)
            .filter((word) => !stopWords.has(word.toLowerCase()))
            .map((word) => word[0].toUpperCase())
            .slice(0, 4)
            .join("") || "SCH";

    const matching = existingBranchIds
        .filter((id) => id?.startsWith(`${prefix}-`))
        .map((id) => parseInt(id.split("-").pop(), 10))
        .filter((n) => !isNaN(n));

    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : 1;

    return `${prefix}-${String(nextSeq).padStart(3, "0")}`;
};
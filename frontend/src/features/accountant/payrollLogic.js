
export const processNetSalary = (base, overtimeHours = 0) => {
    const pf = base * 0.12;  
    const esi = base * 0.0075; 
    const overtime = overtimeHours * 300;
    return {
        net: base + overtime - (pf + esi),
        deductions: pf + esi
    };
};
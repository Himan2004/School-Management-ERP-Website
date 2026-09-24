const fs = require('fs');
const content = fs.readFileSync('routes/student/studentRoutes.js', 'utf8');
const lines = content.split('\n');
const imports = [];
const rest = [];
let inImport = false;
let currentImport = '';
for (const line of lines) {
    if (line.trim().startsWith('import ') && !line.includes('} from') && !line.includes("';") && !line.includes('";')) {
        inImport = true;
        currentImport = line + '\n';
    } else if (inImport) {
        currentImport += line + '\n';
        if (line.includes('} from') || line.includes("';") || line.includes('";')) {
            inImport = false;
            imports.push(currentImport);
            currentImport = '';
        }
    } else if (line.trim().startsWith('import ') && (line.includes('} from') || !line.includes('{') || line.includes("';") || line.includes('";'))) {
        imports.push(line + '\n');
    } else {
        rest.push(line);
    }
}
fs.writeFileSync('routes/student/studentRoutes.js', imports.join('') + '\n' + rest.join('\n'));
console.log('Imports moved to top!');

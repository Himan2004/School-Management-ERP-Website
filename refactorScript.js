const fs = require('fs');
const path = require('path');

const dir = 'frontend/src/pages/student';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const apiMap = {
  fetchStudentDashboard: { var: 'dashboard', api: 'getDashboard' },
  fetchStudentAttendance: { var: 'attendance', api: 'getAttendance' },
  fetchStudentPerformance: { var: 'performance', api: 'getPerformance' },
  fetchStudentHomework: { var: 'homework', api: 'getHomework' },
  fetchStudentExams: { var: 'exams', api: 'getExams' },
  fetchStudentBusTiming: { var: 'busTiming', api: 'getBusTiming' },
  fetchStudentEvents: { var: 'events', api: 'getEvents' },
  fetchStudentStudyMaterial: { var: 'studyMaterial', api: 'getStudyMaterial' },
  fetchStudentTimetable: { var: 'timetable', api: 'getTimetable' },
  fetchStudentMarksheet: { var: 'marksheet', api: 'getMarksheet' },
  fetchStudentHealthCheckup: { var: 'healthCheckup', api: 'getHealthCheckup' },
  fetchStudentIdCard: { var: 'idCard', api: 'getIdCard' },
  fetchStudentAdmitCard: { var: 'admitCard', api: 'getAdmitCard' },
  fetchStudentProfile: { var: 'profile', api: 'getProfile' },
  fetchLeaveHistory: { var: 'leaveHistory', api: 'getLeaveHistory' },
  fetchStudentResults: { var: 'results', api: 'getResults' },
  fetchSupportTickets: { var: 'supportTickets', api: 'getSupportTickets' }
};

let modifiedFiles = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  if (content.includes('react-redux')) {
    // Remove redux imports
    content = content.replace(/import\s+\{\s*(?:useSelector|useDispatch)(?:,\s*)?(?:useSelector|useDispatch)?\s*\}\s*from\s+['"]react-redux['"];?\r?\n/g, '');
    
    // Replace slice imports with API import
    content = content.replace(/import\s+\{[^}]+\}\s*from\s+['"](?:\.\.\/)+features\/student\/studentSlice['"];?\r?\n/g, 
      "import { studentApi } from '../../services/api/studentApi';\n");

    // Remove useDispatch
    content = content.replace(/const\s+dispatch\s*=\s*useDispatch\(\);\s*;?.*?\r?\n/g, '');

    // Transform useSelector (NOW MATCHING TRAILING COMMENTS)
    const selectorRegex = /const\s+\{([^}]+)\}\s*=\s*useSelector\s*\([^)]+\)\s*;?.*?\r?\n/g;
    let stateVars = [];
    content = content.replace(selectorRegex, (match, vars) => {
      stateVars = vars.split(',').map(s => s.trim().split(':')[0]).filter(Boolean);
      let declarations = '';
      stateVars.forEach(v => {
        if (v === 'loading') {
          declarations += `  const [loading, setLoading] = useState(true);\n`;
        } else if (v === 'error') {
          declarations += `  const [error, setError] = useState(null);\n`;
        } else {
          const capV = v.charAt(0).toUpperCase() + v.slice(1);
          declarations += `  const [${v}, set${capV}] = useState(null);\n`;
        }
      });
      return declarations;
    });

    // Replace dispatch(fetchX()) with API calls
    const effectRegex = /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[(.*?)\]\);/g;
    
    content = content.replace(effectRegex, (match, body, deps) => {
      if (body.includes('dispatch(') && body.includes('fetch')) {
        const fetchRegex = /dispatch\((fetch[a-zA-Z0-9_]+)\([^)]*\)\)/g;
        let fetchCalls = [];
        let fMatch;
        while ((fMatch = fetchRegex.exec(body)) !== null) {
          fetchCalls.push(fMatch[1]);
        }
        
        if (fetchCalls.length > 0) {
          let asyncBody = `\n    const loadData = async () => {\n      setLoading(true);\n      try {\n`;
          fetchCalls.forEach(f => {
            if (apiMap[f]) {
              const apiName = apiMap[f].api;
              const varName = apiMap[f].var;
              const capVar = varName.charAt(0).toUpperCase() + varName.slice(1);
              if (stateVars.includes(varName)) {
                asyncBody += `        const ${varName}Data = await studentApi.${apiName}();\n`;
                asyncBody += `        set${capVar}(${varName}Data.data || ${varName}Data);\n`;
              } else {
                 asyncBody += `        await studentApi.${apiName}();\n`;
              }
            }
          });
          asyncBody += `      } catch (err) {\n        console.error(err);\n        if (typeof setError === 'function') setError(err);\n      } finally {\n        setLoading(false);\n      }\n    };\n    loadData();\n  `;
          return `useEffect(() => {${asyncBody}}, []);`;
        }
      }
      
      // If dispatch is in dependency array, remove it
      if (deps.includes('dispatch')) {
        let newDeps = deps.split(',').map(d => d.trim()).filter(d => d !== 'dispatch').join(', ');
        return `useEffect(() => {${body}}, [${newDeps}]);`;
      }
      return match;
    });

    // Replace loading.dashboard, error.exams, etc., with just loading / error
    content = content.replace(/loading\.[a-zA-Z0-9_]+/g, 'loading');
    content = content.replace(/error\.[a-zA-Z0-9_]+/g, 'error');

    // Clean up leftover dispatch() wrappers for updates/creates
    content = content.replace(/dispatch\((addTicketMessage|createSupportTicket|applyForHealthCheckup|submitLeave|registerForEvent|unregisterFromEvent|submitHomework)\((.*?)\)\)/g, 
      (match, func, args) => `studentApi.${func}(${args})`);

    // Ensure useState/useEffect is imported if missing
    if (content.includes('useState') && !content.includes('import { useState')) {
      if (content.includes("import React from 'react'")) {
        content = content.replace("import React from 'react'", "import React, { useState, useEffect } from 'react'");
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      modifiedFiles++;
      console.log(`Refactored ${file}`);
    }
  }
});

console.log(`Successfully refactored ${modifiedFiles} files.`);

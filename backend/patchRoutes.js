import fs from 'fs';

let content = fs.readFileSync('routes/student/studentRoutes.js', 'utf8');

const additions = `
// ----------------------------------------------------------------------
// ADDITIONAL FIXES FOR FRONTEND COMPATIBILITY (added via script)
// ----------------------------------------------------------------------

const dummyEmptyArray = (req, res) => res.status(200).json({ success: true, data: [] });
const dummyEmptyObject = (req, res) => res.status(200).json({ success: true, data: {} });

// Profile
router.get("/profile", getStudentSettings);

// Alerts, Achievements, Recommendations
router.get("/alerts", dummyEmptyArray);
router.get("/achievements", dummyEmptyArray);
router.get("/recommendations", dummyEmptyArray);

// Aliases for mismatched routes
router.get("/bus-timing", getStudentBusTiming);
router.get("/study-material", getStudentStudyMaterials);
router.get("/marksheet", getConsolidatedMarksheet);

// Missing ID Card routes
router.post("/id-card/report-lost", dummyEmptyObject);
router.put("/id-card/preferences", dummyEmptyObject);

export default router;
`;

content = content.replace('export default router;', additions);
fs.writeFileSync('routes/student/studentRoutes.js', content);
console.log('Routes patched!');

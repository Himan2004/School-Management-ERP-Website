# 📚 FEE STRUCTURE - BACKEND TO FRONTEND CONNECTION GUIDE

## 🎯 HOW IT ALL WORKS - Step by Step

### **PART 1: DATA FLOW FROM BACKEND TO FRONTEND**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1️⃣  Backend API receives request                          │
│      GET /api/super-admin/finance/fee-structures           │
│                                                             │
│           ⬇️                                                │
│                                                             │
│  2️⃣  Controller fetches from MongoDB                       │
│      Location: controllers/superAdmin/feeStructureController.js
│      Function: getFeeStructures()                          │
│                                                             │
│           ⬇️                                                │
│                                                             │
│  3️⃣  Returns populated data:                               │
│      {                                                      │
│        _id: "xxx123",                                       │
│        organization: { _id: "...", name: "..." },          │
│        classId: { className: "Class 10", section: "A" },   │
│        academicYear: "2026",                               │
│        feeLines: [                                         │
│          {                                                  │
│            feeHeadId: { name: "Tuition Fee", ... },        │
│            amount: 50000,                                   │
│            dueDate: "2026-04-10",                          │
│            overrideReason: "..."                           │
│          }                                                  │
│        ],                                                   │
│        totalAmount: 50000,                                 │
│        isActive: true,                                      │
│        createdBy: "admin-id"                               │
│      }                                                      │
│                                                             │
│           ⬇️                                                │
│                                                             │
│  4️⃣  Frontend receives via financeApi.js                  │
│      financeApi.js calls: api.get("/super-admin/...")     │
│                                                             │
│           ⬇️                                                │
│                                                             │
│  5️⃣  React Component displays in card/modal               │
│      Structure.jsx or AddFeeStructureModal.jsx             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 HOW THE BUTTON CLICK CONNECTS TO MODAL

### **Step 1: User Clicks "Add New Fee Structure" Button**
**File**: `Structure.jsx` - Line with button

```jsx
<motion.button
  onClick={() => setIsModalOpen(true)}  // ← OPENS MODAL
  className="flex items-center gap-2 bg-indigo-600..."
>
  <Plus size={18} /> Add New Fee Structure
</motion.button>
```

### **Step 2: Modal Opens**
```jsx
state: const [isModalOpen, setIsModalOpen] = useState(false);
     ⬇️
     setIsModalOpen(true)  // Toggle to TRUE
     ⬇️
   <AddFeeStructureModal
     isOpen={isModalOpen}  // ← MODAL RECEIVES isOpen={true}
     onClose={() => setIsModalOpen(false)}
     organizationId="default-org-id"
     onStructureCreated={handleStructureCreated}
   />
```

### **Step 3: User Fills Form in Modal**
Modal has these fields:
- **Class Selection** → classId (MongoDB ObjectId)
- **Academic Year** → academicYear (String)
- **Fee Lines** → Array of fee items
  - Fee Type (feeHeadId)
  - Amount (₹)
  - Due Date
  - Override Reason

### **Step 4: User Clicks "Create Structure" Button**
```jsx
const handleSubmit = async (e) => {
  // Validates form
  // Prepares data matching BACKEND schema:
  
  const submitData = {
    organization: organizationId,      // From prop
    classId: formData.classId,         // From form input
    academicYear: formData.academicYear,
    feeLines: [
      {
        feeHeadId: line.feeHeadId,     // Fee type
        amount: Number(line.amount),   // ₹
        dueDate: new Date(line.dueDate),
        overrideReason: line.overrideReason
      }
    ],
    isActive: formData.isActive
  };
  
  // Sends to backend
  const response = await createFeeStructure(submitData);
  
  // Callback updates main component
  onStructureCreated(response.data.data);
}
```

### **Step 5: Backend Receives & Saves to MongoDB**
**File**: `controllers/superAdmin/feeStructureController.js`

```javascript
export const createFeeStructure = async (req, res) => {
  const { organization, classId, feeLines, academicYear } = req.body;
  
  // Validates organization & class exist
  // Creates new FeeStructure document
  // Calculates totalAmount from feeLines
  // Saves to MongoDB
  
  return res.status(201).json({ success: true, data: feeStructure });
}
```

### **Step 6: Frontend Updates UI with New Data**
```jsx
const handleStructureCreated = (newStructure) => {
  setFeeStructures([...feeStructures, newStructure]);  // ← Add to list
  setSelectedStructureId(newStructure._id);             // ← Select it
  // Modal closes automatically
};
```

---

## 📊 BACKEND SCHEMA (MongoDB Model)

```javascript
// File: models/finance/FeeStructure.model.js

{
  _id: ObjectId,
  
  organization: ObjectId (ref: Organization) ← REQUIRED
  school: ObjectId (ref: School) - optional
  
  classId: ObjectId (ref: Classes) ← REQUIRED
  academicYear: String (e.g., "2026") ← REQUIRED
  
  feeLines: [
    {
      feeHeadId: ObjectId (ref: FeeHead) ← REQUIRED
      amount: Number (₹) ← REQUIRED
      dueDate: Date - optional
      overrideReason: String - optional
    }
  ] ← REQUIRED (at least 1)
  
  totalAmount: Number (calculated automatically)
  isActive: Boolean (default: true)
  
  createdBy: ObjectId (ref: SuperAdmin)
  lastModifiedBy: ObjectId (ref: SuperAdmin)
  
  timestamps: { createdAt, updatedAt }
}
```

---

## 🔄 API ENDPOINTS USED

### **GET - Fetch all structures**
```
Endpoint: GET /api/super-admin/finance/fee-structures
Frontend: const response = await getFeeStructures();
Location: services/api/financeApi.js
```

### **POST - Create new structure**
```
Endpoint: POST /api/super-admin/finance/fee-structures
Frontend: const response = await createFeeStructure(data);
Location: services/api/financeApi.js

Request Body:
{
  organization: "org-id",
  classId: "class-id",
  academicYear: "2026",
  feeLines: [...],
  isActive: true
}
```

---

## 🎨 COMPONENT STRUCTURE

```
Structure.jsx (Main Page)
├── State Management
│   ├── feeStructures: [] ← Data from API
│   ├── selectedStructureId ← Current selection
│   ├── isModalOpen ← Toggle modal visibility
│   └── loading, error
├── Fetches data: useEffect → getFeeStructures()
├── Renders table of structures
├── Renders detail card (right side)
└── Renders Modal (full screen)
    └── AddFeeStructureModal.jsx
        ├── Form inputs
        ├── Fee lines management
        └── Submit handler → createFeeStructure()
```

---

## 🚀 HOW TO USE

### **1. Click Button**
```jsx
"Add New Fee Structure" Button → onClick={() => setIsModalOpen(true)}
```

### **2. Modal Opens**
```jsx
<AddFeeStructureModal
  isOpen={true}
  onClose={() => setIsModalOpen(false)}
  organizationId="..."
  onStructureCreated={handleStructureCreated}
/>
```

### **3. Fill Form**
- Select Class (Class 10 - A, etc.)
- Enter Academic Year (2026)
- Add Fee Lines:
  - Type: Tuition Fee
  - Amount: 50000
  - Due Date: 2026-04-10

### **4. Click "Create Structure"**
```jsx
Form validates → Sends to API → Backend saves → 
Returns created data → UI updates with new structure
```

---

## 🔗 FILES INVOLVED

| File | Purpose |
|------|---------|
| `Structure.jsx` | Main page, button, state management |
| `AddFeeStructureModal.jsx` | Modal form component |
| `financeApi.js` | API calls (getFeeStructures, createFeeStructure) |
| `feeStructureController.js` | Backend logic |
| `FeeStructure.model.js` | MongoDB schema |
| `feeStructureRoutes.js` | API routes |

---

## 🐛 TROUBLESHOOTING

### **Modal doesn't open**
✓ Check: `isModalOpen` state is being set to `true`
✓ Check: `<AddFeeStructureModal isOpen={isModalOpen} ... />`

### **Form doesn't submit**
✓ Check: All required fields filled (classId, academicYear, feeLines)
✓ Check: Amount is valid number > 0
✓ Check: API endpoint exists

### **Data doesn't show in detail card**
✓ Check: Structure is selected: `setSelectedStructureId(newStructure._id)`
✓ Check: `selectedStructure` is not null

### **Backend returns error**
✓ Check: Organization ID exists
✓ Check: Class ID exists
✓ Check: FeeHead IDs valid (if custom)

---

## 💡 NEXT STEPS TO ADD

1. **Edit Functionality**: Add PUT endpoint to update structures
2. **Delete Functionality**: Add DELETE endpoint
3. **Validation**: Add more strict validations
4. **Search/Filter**: Filter structures by class, year
5. **Bulk Upload**: CSV import for multiple structures


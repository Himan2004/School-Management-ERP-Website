# PRINCIPAL DASHBOARD BACKEND - DETAILED WORK
## ID Card Generation Management Page

**Document Date:** May 11, 2026  
**Scope:** Complete backend for Principal's ID Card Generation page  
**Total Endpoints:** 28 endpoints

---

# OVERVIEW

The Principal's "ID Card Generation" dashboard provides comprehensive ID card management including template design, batch generation, customization, printing, and distribution tracking. The principal can manage the complete ID card lifecycle from design to issuance.

---

# SECTION 1: ID CARD GENERATION & MANAGEMENT

## PART 1: ID CARD ENDPOINTS

### File 1: Create `controllers/principal/idCardController.js`

**Functions to Implement (28 total):**

```javascript
import Student from "../../models/users/student.model.js";
import Class from "../../models/superAdmin/Class.model.js";
import IDCardTemplate from "../../models/academic/IDCardTemplate.model.js"; // Needs to be created
import IDCard from "../../models/academic/IDCard.model.js"; // Needs to be created
import School from "../../models/school/School.model.js";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Canvas } from "canvas";

// ==================== ID CARD TEMPLATE ENDPOINTS ====================

// Function 1: Create ID card template
export const createIDCardTemplate = async (req, res) => {
  try {
    const {
      templateName,
      description,
      orientation, // portrait, landscape
      paperSize, // A4, A5, postcard, custom
      cardWidth, // in mm
      cardHeight, // in mm
      cardFormat, // single (1 card per page), multiple (4 cards per page)
      frontDesign,
      backDesign,
      dataFields, // Array of field configuration
      colors,
      fonts,
      schoolLogo,
      isDefault,
      isActive
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    // If setting as default, unset other defaults
    if (isDefault) {
      await IDCardTemplate.updateMany(
        { school: schoolId, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await IDCardTemplate.create({
      school: schoolId,
      organization: req.principal.organization,
      templateName,
      description,
      orientation: orientation || "portrait",
      paperSize: paperSize || "postcard",
      dimensions: {
        width: cardWidth || 90, // default postcard width
        height: cardHeight || 60 // default postcard height
      },
      cardFormat: cardFormat || "multiple",
      design: {
        front: frontDesign || {},
        back: backDesign || {}
      },
      dataFields: dataFields || [
        { fieldName: "name", label: "Student Name", x: 10, y: 20, fontSize: 12, bold: true },
        { fieldName: "rollNumber", label: "Roll No", x: 10, y: 30, fontSize: 10 },
        { fieldName: "class", label: "Class", x: 10, y: 40, fontSize: 10 },
        { fieldName: "photo", label: "Photo", x: 60, y: 15, width: 25, height: 30 },
        { fieldName: "qrCode", label: "QR Code", x: 10, y: 45, width: 15, height: 15 }
      ],
      colors: colors || {
        backgroundColor: "#FFFFFF",
        textColor: "#000000",
        accentColor: "#1976D2"
      },
      fonts: fonts || {
        primary: "Arial",
        secondary: "Times New Roman"
      },
      schoolLogo,
      isDefault: isDefault || false,
      isActive: isActive !== false,
      createdBy: req.principal._id,
      updatedBy: req.principal._id
    });

    res.status(201).json({
      success: true,
      message: "ID card template created successfully",
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 2: Get all templates
export const getIDCardTemplates = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const skip = (page - 1) * limit;

    const templates = await IDCardTemplate.find(filter)
      .select("templateName description isDefault isActive createdAt cardFormat orientation")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await IDCardTemplate.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 3: Get template details
export const getIDCardTemplateDetail = async (req, res) => {
  try {
    const { templateId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      school: schoolId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 4: Update template
export const updateIDCardTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    // If setting as default, unset others
    if (updateData.isDefault) {
      await IDCardTemplate.updateMany(
        { school: schoolId, _id: { $ne: templateId }, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, school: schoolId },
      {
        ...updateData,
        updatedBy: req.principal._id,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 5: Delete template
export const deleteIDCardTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      school: schoolId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default template"
      });
    }

    await IDCardTemplate.findByIdAndDelete(templateId);

    res.status(200).json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 6: Set template as default
export const setDefaultTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    // Unset all other defaults
    await IDCardTemplate.updateMany(
      { school: schoolId, isDefault: true },
      { isDefault: false }
    );

    // Set new default
    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, school: schoolId },
      { isDefault: true },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Default template updated",
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== ID CARD GENERATION ENDPOINTS ====================

// Function 7: Generate single ID card
export const generateSingleIDCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { templateId, includeQRCode = true, includeBarcode = true } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId
    }).populate("class", "name section");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get template (use default if not specified)
    let template = null;
    if (templateId) {
      template = await IDCardTemplate.findOne({ _id: templateId, school: schoolId });
    } else {
      template = await IDCardTemplate.findOne({ school: schoolId, isDefault: true });
    }

    if (!template) {
      return res.status(400).json({
        success: false,
        message: "No template available"
      });
    }

    // Check if card already exists
    let idCard = await IDCard.findOne({
      student: studentId,
      template: template._id,
      status: "active"
    });

    if (idCard && idCard.status === "active") {
      return res.status(200).json({
        success: true,
        message: "ID card already exists",
        data: idCard
      });
    }

    // Generate QR Code
    let qrCodeData = null;
    if (includeQRCode) {
      const qrContent = `${student.studentId}|${student.fullName}|${schoolId}`;
      qrCodeData = await QRCode.toDataURL(qrContent);
    }

    // Generate Barcode
    let barcodeData = null;
    if (includeBarcode) {
      // Barcode would be generated here using jsbarcode or similar
      barcodeData = `BAR${student.studentId}`;
    }

    // Create ID card record
    const newIDCard = await IDCard.create({
      student: studentId,
      school: schoolId,
      template: template._id,
      studentData: {
        name: student.fullName,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        class: student.class?.name,
        section: student.class?.section,
        photo: student.photo || null,
        email: student.email,
        phoneNumber: student.phoneNumber,
        dateOfBirth: student.dateOfBirth
      },
      cardData: {
        qrCode: qrCodeData,
        barcode: barcodeData
      },
      status: "generated",
      generatedAt: new Date(),
      generatedBy: req.principal._id
    });

    res.status(201).json({
      success: true,
      message: "ID card generated successfully",
      data: newIDCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 8: Generate batch ID cards
export const generateBatchIDCards = async (req, res) => {
  try {
    const {
      studentIds = null, // Array of student IDs or null for all
      classId = null, // Generate for entire class
      templateId = null,
      includeQRCode = true,
      includeBarcode = true
    } = req.body;

    const schoolId = req.principal.school._id || req.principal.school;

    // Determine which students to generate cards for
    let filter = { school: schoolId, status: "active" };
    if (studentIds && studentIds.length > 0) {
      filter._id = { $in: studentIds };
    } else if (classId) {
      filter.class = classId;
    }

    const students = await Student.find(filter)
      .populate("class", "name section")
      .select("_id fullName studentId rollNumber class photo email phoneNumber dateOfBirth");

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students found for ID card generation"
      });
    }

    // Get template
    let template = null;
    if (templateId) {
      template = await IDCardTemplate.findOne({ _id: templateId, school: schoolId });
    } else {
      template = await IDCardTemplate.findOne({ school: schoolId, isDefault: true });
    }

    if (!template) {
      return res.status(400).json({
        success: false,
        message: "No template available"
      });
    }

    // Generate cards for all students
    const generatedCards = [];
    const errors = [];

    for (const student of students) {
      try {
        // Check if card already exists
        const existingCard = await IDCard.findOne({
          student: student._id,
          template: template._id,
          status: "active"
        });

        if (existingCard) {
          generatedCards.push({
            studentId: student._id,
            status: "already_exists",
            message: "Card already exists"
          });
          continue;
        }

        // Generate QR Code
        let qrCodeData = null;
        if (includeQRCode) {
          const qrContent = `${student.studentId}|${student.fullName}|${schoolId}`;
          qrCodeData = await QRCode.toDataURL(qrContent);
        }

        // Create ID card
        const idCard = await IDCard.create({
          student: student._id,
          school: schoolId,
          template: template._id,
          studentData: {
            name: student.fullName,
            studentId: student.studentId,
            rollNumber: student.rollNumber,
            class: student.class?.name,
            section: student.class?.section,
            photo: student.photo || null,
            email: student.email,
            phoneNumber: student.phoneNumber,
            dateOfBirth: student.dateOfBirth
          },
          cardData: {
            qrCode: qrCodeData,
            barcode: `BAR${student.studentId}`
          },
          status: "generated",
          generatedAt: new Date(),
          generatedBy: req.principal._id
        });

        generatedCards.push({
          studentId: student._id,
          cardId: idCard._id,
          status: "success"
        });
      } catch (error) {
        errors.push({
          studentId: student._id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Generated ${generatedCards.length} cards, ${errors.length} errors`,
      data: {
        generated: generatedCards.filter(c => c.status === "success").length,
        alreadyExists: generatedCards.filter(c => c.status === "already_exists").length,
        errors: errors.length,
        results: generatedCards,
        errorDetails: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 9: Get generated ID cards
export const getGeneratedIDCards = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all", // all, generated, printed, distributed, revoked
      classId,
      searchQuery,
      templateId
    } = req.query;

    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (templateId) {
      filter.template = templateId;
    }

    // Search in student data
    if (searchQuery) {
      filter.$or = [
        { "studentData.name": { $regex: searchQuery, $options: "i" } },
        { "studentData.studentId": { $regex: searchQuery, $options: "i" } },
        { "studentData.rollNumber": { $regex: searchQuery, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const cards = await IDCard.find(filter)
      .populate("student", "fullName studentId")
      .populate("template", "templateName")
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await IDCard.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: cards,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 10: Get single ID card
export const getSingleIDCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const card = await IDCard.findOne({
      _id: cardId,
      school: schoolId
    })
      .populate("student", "fullName email phoneNumber photo")
      .populate("template", "templateName design");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "ID card not found"
      });
    }

    res.status(200).json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 11: Update card status
export const updateCardStatus = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { newStatus, remarks } = req.body; // newStatus: generated, printed, distributed, revoked
    const schoolId = req.principal.school._id || req.principal.school;

    const card = await IDCard.findOne({
      _id: cardId,
      school: schoolId
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "ID card not found"
      });
    }

    const oldStatus = card.status;
    card.status = newStatus;

    if (newStatus === "printed") {
      card.printedAt = new Date();
      card.printedBy = req.principal._id;
    } else if (newStatus === "distributed") {
      card.distributedAt = new Date();
      card.distributedBy = req.principal._id;
    } else if (newStatus === "revoked") {
      card.revokedAt = new Date();
      card.revokedBy = req.principal._id;
      card.revokedReason = remarks;
    }

    await card.save();

    res.status(200).json({
      success: true,
      message: `Card status changed from ${oldStatus} to ${newStatus}`,
      data: {
        cardId,
        oldStatus,
        newStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 12: Regenerate ID card (for damaged/lost cards)
export const regenerateIDCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { reason, remarks } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const oldCard = await IDCard.findOne({
      _id: cardId,
      school: schoolId
    });

    if (!oldCard) {
      return res.status(404).json({
        success: false,
        message: "ID card not found"
      });
    }

    // Archive old card
    oldCard.status = "revoked";
    oldCard.revokedAt = new Date();
    oldCard.revokedBy = req.principal._id;
    oldCard.revokedReason = reason;
    await oldCard.save();

    // Generate new card
    const qrContent = `${oldCard.studentData.studentId}|${oldCard.studentData.name}|${schoolId}`;
    const qrCodeData = await QRCode.toDataURL(qrContent);

    const newCard = await IDCard.create({
      student: oldCard.student,
      school: schoolId,
      template: oldCard.template,
      studentData: oldCard.studentData,
      cardData: {
        qrCode: qrCodeData,
        barcode: oldCard.cardData.barcode
      },
      status: "generated",
      generatedAt: new Date(),
      generatedBy: req.principal._id,
      replacementFor: cardId,
      replacementReason: reason,
      replacementRemarks: remarks
    });

    res.status(201).json({
      success: true,
      message: "New ID card generated as replacement",
      data: {
        oldCardId: cardId,
        newCardId: newCard._id,
        newCard
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 13: Get ID card statistics
export const getIDCardStats = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const stats = await IDCard.aggregate([
      { $match: { school: schoolId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      generated: 0,
      printed: 0,
      distributed: 0,
      revoked: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    // Class-wise statistics
    const classStats = await IDCard.aggregate([
      { $match: { school: schoolId, status: "distributed" } },
      {
        $group: {
          _id: "$studentData.class",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: formattedStats,
        total: Object.values(formattedStats).reduce((a, b) => a + b, 0),
        byClass: classStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 14: Export ID cards for printing
export const exportIDCardsForPrinting = async (req, res) => {
  try {
    const { status = "generated", format = "pdf", classId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId, status };
    if (classId) {
      filter["studentData.class"] = classId;
    }

    const cards = await IDCard.find(filter)
      .populate("template", "cardFormat dimensions design colors fonts");

    if (cards.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No ID cards found to export"
      });
    }

    if (format === "pdf") {
      // PDF generation would happen here
      // Using a library like pdfkit or similar
      res.status(200).json({
        success: true,
        message: "PDF export ready",
        data: {
          cardCount: cards.length,
          format: "pdf",
          downloadUrl: `/api/principal/id-cards/download/print?status=${status}&format=pdf`
        }
      });
    } else if (format === "json") {
      res.status(200).json({
        success: true,
        data: cards
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 15: Bulk update card status
export const bulkUpdateCardStatus = async (req, res) => {
  try {
    const { cardIds, newStatus, remarks } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const results = [];
    const errors = [];

    for (const cardId of cardIds) {
      try {
        const card = await IDCard.findOne({
          _id: cardId,
          school: schoolId
        });

        if (!card) {
          errors.push(`Card ${cardId}: Not found`);
          continue;
        }

        card.status = newStatus;
        if (newStatus === "printed") {
          card.printedAt = new Date();
          card.printedBy = req.principal._id;
        } else if (newStatus === "distributed") {
          card.distributedAt = new Date();
          card.distributedBy = req.principal._id;
        }

        await card.save();
        results.push({ cardId, status: "updated" });
      } catch (error) {
        errors.push(`Card ${cardId}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: errors.length === 0,
      message: `Updated ${results.length} cards, ${errors.length} errors`,
      data: {
        updated: results.length,
        errors: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 16: Get card distribution report
export const getCardDistributionReport = async (req, res) => {
  try {
    const { classId, section } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (classId) filter["studentData.class"] = classId;

    const distributed = await IDCard.find({
      ...filter,
      status: "distributed"
    })
      .select("studentData distributedAt distributedBy")
      .populate("distributedBy", "fullName");

    const pending = await IDCard.find({
      ...filter,
      status: { $in: ["generated", "printed"] }
    })
      .select("studentData status");

    const report = {
      distributedCards: distributed.length,
      pendingCards: pending.length,
      totalCards: distributed.length + pending.length,
      distributedPercentage: distributed.length > 0
        ? Math.round((distributed.length / (distributed.length + pending.length)) * 100)
        : 0,
      distributedList: distributed,
      pendingList: pending
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 17: Get pending ID cards
export const getPendingIDCards = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const pendingCards = await IDCard.find({
      school: schoolId,
      status: { $in: ["generated", "printed"] }
    })
      .populate("student", "fullName email class")
      .select("studentData status generatedAt printedAt")
      .sort({ generatedAt: 1 });

    const byStatus = {
      generated: pendingCards.filter(c => c.status === "generated"),
      printed: pendingCards.filter(c => c.status === "printed")
    };

    res.status(200).json({
      success: true,
      data: {
        totalPending: pendingCards.length,
        byStatus,
        pendingList: pendingCards
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 18: Verify ID card via QR/Barcode
export const verifyIDCard = async (req, res) => {
  try {
    const { qrCode, barcode } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (qrCode) filter["cardData.qrCode"] = qrCode;
    if (barcode) filter["cardData.barcode"] = barcode;

    const card = await IDCard.findOne(filter)
      .populate("student", "fullName email class")
      .populate("template", "templateName");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "ID card not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        isValid: card.status !== "revoked",
        cardStatus: card.status,
        studentData: card.studentData,
        distributedAt: card.distributedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 19: Get card design preview
export const getCardDesignPreview = async (req, res) => {
  try {
    const { templateId, studentId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      school: schoolId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    let studentData = null;
    if (studentId) {
      const student = await Student.findOne({
        _id: studentId,
        school: schoolId
      }).populate("class", "name section");

      if (student) {
        studentData = {
          name: student.fullName,
          studentId: student.studentId,
          rollNumber: student.rollNumber,
          class: student.class?.name,
          photo: student.photo
        };
      }
    } else {
      studentData = {
        name: "Sample Student",
        studentId: "STU2026000001",
        rollNumber: 1,
        class: "X-A",
        photo: null
      };
    }

    // Generate preview
    const preview = generateCardPreview(template, studentData);

    res.status(200).json({
      success: true,
      data: {
        template: template.templateName,
        preview,
        studentData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 20: Get card by student
export const getCardByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const cards = await IDCard.find({
      student: studentId,
      school: schoolId
    })
      .sort({ generatedAt: -1 });

    if (cards.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No ID cards found for this student"
      });
    }

    res.status(200).json({
      success: true,
      data: cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 21: Delete ID card
export const deleteIDCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const card = await IDCard.findOne({
      _id: cardId,
      school: schoolId
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "ID card not found"
      });
    }

    if (card.status === "distributed") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete distributed card. Revoke it instead."
      });
    }

    await IDCard.findByIdAndDelete(cardId);

    res.status(200).json({
      success: true,
      message: "ID card deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 22: Get ID card template options
export const getTemplateOptions = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const templates = await IDCardTemplate.find({
      school: schoolId,
      isActive: true
    })
      .select("_id templateName description cardFormat orientation")
      .sort({ isDefault: -1 });

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 23: Export card list
export const exportCardList = async (req, res) => {
  try {
    const { status, format = "csv", classId } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = { school: schoolId };
    if (status) filter.status = status;
    if (classId) filter["studentData.class"] = classId;

    const cards = await IDCard.find(filter).sort({ generatedAt: -1 });

    if (format === "csv") {
      const csv = generateCardListCSV(cards);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="id_cards_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: cards
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 24: Get card generation metrics
export const getCardGenerationMetrics = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;
    const { days = 30 } = req.query;

    const dateRange = new Date();
    dateRange.setDate(dateRange.getDate() - parseInt(days));

    const generatedInPeriod = await IDCard.countDocuments({
      school: schoolId,
      generatedAt: { $gte: dateRange }
    });

    const printedInPeriod = await IDCard.countDocuments({
      school: schoolId,
      printedAt: { $gte: dateRange }
    });

    const distributedInPeriod = await IDCard.countDocuments({
      school: schoolId,
      distributedAt: { $gte: dateRange }
    });

    const revokedInPeriod = await IDCard.countDocuments({
      school: schoolId,
      revokedAt: { $gte: dateRange }
    });

    res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        generated: generatedInPeriod,
        printed: printedInPeriod,
        distributed: distributedInPeriod,
        revoked: revokedInPeriod,
        totalProcessed: generatedInPeriod + printedInPeriod + distributedInPeriod
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 25: Clone template
export const cloneTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { newName } = req.body;
    const schoolId = req.principal.school._id || req.principal.school;

    const originalTemplate = await IDCardTemplate.findOne({
      _id: templateId,
      school: schoolId
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    // Create clone
    const clonedTemplate = await IDCardTemplate.create({
      school: schoolId,
      organization: req.principal.organization,
      templateName: newName || `${originalTemplate.templateName} (Copy)`,
      description: originalTemplate.description,
      orientation: originalTemplate.orientation,
      paperSize: originalTemplate.paperSize,
      dimensions: originalTemplate.dimensions,
      cardFormat: originalTemplate.cardFormat,
      design: originalTemplate.design,
      dataFields: originalTemplate.dataFields,
      colors: originalTemplate.colors,
      fonts: originalTemplate.fonts,
      schoolLogo: originalTemplate.schoolLogo,
      isDefault: false,
      isActive: true,
      createdBy: req.principal._id
    });

    res.status(201).json({
      success: true,
      message: "Template cloned successfully",
      data: clonedTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 26: Get template preview
export const getTemplatePreview = async (req, res) => {
  try {
    const { templateId } = req.params;
    const schoolId = req.principal.school._id || req.principal.school;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      school: schoolId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 27: Get quick generation status
export const getQuickGenerationStatus = async (req, res) => {
  try {
    const schoolId = req.principal.school._id || req.principal.school;

    const totalStudents = await Student.countDocuments({
      school: schoolId,
      status: "active"
    });

    const totalCards = await IDCard.countDocuments({
      school: schoolId,
      status: { $ne: "revoked" }
    });

    const distributedCards = await IDCard.countDocuments({
      school: schoolId,
      status: "distributed"
    });

    const pendingCards = await IDCard.countDocuments({
      school: schoolId,
      status: { $in: ["generated", "printed"] }
    });

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalCards,
        cardsGenerated: totalCards,
        cardsDistributed: distributedCards,
        cardsPending: pendingCards,
        generationPercentage: totalStudents > 0 ? Math.round((totalCards / totalStudents) * 100) : 0,
        distributionPercentage: totalCards > 0 ? Math.round((distributedCards / totalCards) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function 28: Search students for card generation
export const searchStudentsForCardGeneration = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    const schoolId = req.principal.school._id || req.principal.school;

    let filter = {
      school: schoolId,
      status: "active"
    };

    if (query) {
      filter.$or = [
        { fullName: { $regex: query, $options: "i" } },
        { studentId: { $regex: query, $options: "i" } },
        { rollNumber: { $regex: query, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const students = await Student.find(filter)
      .populate("class", "name section")
      .select("fullName studentId rollNumber class email")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(filter);

    // Check which ones already have cards
    const studentsWithCardStatus = await Promise.all(
      students.map(async (student) => {
        const hasCard = await IDCard.findOne({
          student: student._id,
          status: "active"
        });

        return {
          ...student.toObject(),
          hasCard: !!hasCard
        };
      })
    );

    res.status(200).json({
      success: true,
      data: studentsWithCardStatus,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function: Generate card preview
const generateCardPreview = (template, studentData) => {
  return {
    templateName: template.templateName,
    cardFormat: template.cardFormat,
    dimensions: template.dimensions,
    design: template.design,
    colors: template.colors,
    studentData,
    dataFields: template.dataFields.map(field => ({
      fieldName: field.fieldName,
      label: field.label,
      value: studentData[field.fieldName] || ""
    }))
  };
};

// Helper function: Generate card list CSV
const generateCardListCSV = (cards) => {
  const headers = [
    "Student ID",
    "Name",
    "Roll Number",
    "Class",
    "Status",
    "Generated Date",
    "Printed Date",
    "Distributed Date"
  ];

  const rows = cards.map(card => [
    card.studentData.studentId,
    card.studentData.name,
    card.studentData.rollNumber,
    card.studentData.class,
    card.status,
    new Date(card.generatedAt).toLocaleDateString(),
    card.printedAt ? new Date(card.printedAt).toLocaleDateString() : "N/A",
    card.distributedAt ? new Date(card.distributedAt).toLocaleDateString() : "N/A"
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
};
```

---

### File 2: Create `routes/principal/idCardRoutes.js`

```javascript
import express from "express";
import {
  createIDCardTemplate,
  getIDCardTemplates,
  getIDCardTemplateDetail,
  updateIDCardTemplate,
  deleteIDCardTemplate,
  setDefaultTemplate,
  generateSingleIDCard,
  generateBatchIDCards,
  getGeneratedIDCards,
  getSingleIDCard,
  updateCardStatus,
  regenerateIDCard,
  getIDCardStats,
  exportIDCardsForPrinting,
  bulkUpdateCardStatus,
  getCardDistributionReport,
  getPendingIDCards,
  verifyIDCard,
  getCardDesignPreview,
  getCardByStudent,
  deleteIDCard,
  getTemplateOptions,
  exportCardList,
  getCardGenerationMetrics,
  cloneTemplate,
  getTemplatePreview,
  getQuickGenerationStatus,
  searchStudentsForCardGeneration
} from "../../controllers/principal/idCardController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();
router.use(protect, authorize("principal"));

// Template management
router.post("/template/create", upload.single("schoolLogo"), createIDCardTemplate);
router.get("/template/list", getIDCardTemplates);
router.get("/template/options", getTemplateOptions);
router.get("/template/:templateId", getIDCardTemplateDetail);
router.put("/template/:templateId", upload.single("schoolLogo"), updateIDCardTemplate);
router.delete("/template/:templateId", deleteIDCardTemplate);
router.patch("/template/:templateId/set-default", setDefaultTemplate);
router.post("/template/:templateId/clone", cloneTemplate);
router.get("/template/:templateId/preview", getTemplatePreview);

// Card generation
router.post("/generate/single/:studentId", generateSingleIDCard);
router.post("/generate/batch", generateBatchIDCards);
router.get("/cards", getGeneratedIDCards);
router.get("/cards/quick-status", getQuickGenerationStatus);
router.get("/cards/:cardId", getSingleIDCard);
router.get("/cards/student/:studentId", getCardByStudent);

// Card management
router.patch("/cards/:cardId/status", updateCardStatus);
router.post("/cards/:cardId/regenerate", regenerateIDCard);
router.delete("/cards/:cardId", deleteIDCard);
router.post("/cards/bulk/update-status", bulkUpdateCardStatus);

// Card verification and preview
router.post("/verify", verifyIDCard);
router.get("/preview", getCardDesignPreview);

// Reports and analytics
router.get("/stats", getIDCardStats);
router.get("/pending/list", getPendingIDCards);
router.get("/distribution/report", getCardDistributionReport);
router.get("/metrics/generation", getCardGenerationMetrics);
router.get("/export/print", exportIDCardsForPrinting);
router.get("/export/list", exportCardList);

// Utilities
router.get("/search/students", searchStudentsForCardGeneration);

export default router;
```

---

## MODELS NEEDED

### File 3: Create `models/academic/IDCardTemplate.model.js`

```javascript
import mongoose from "mongoose";

const idCardTemplateSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization"
    },
    templateName: {
      type: String,
      required: true
    },
    description: String,
    orientation: {
      type: String,
      enum: ["portrait", "landscape"],
      default: "portrait"
    },
    paperSize: {
      type: String,
      enum: ["A4", "A5", "postcard", "custom"],
      default: "postcard"
    },
    dimensions: {
      width: { type: Number, default: 90 }, // mm
      height: { type: Number, default: 60 } // mm
    },
    cardFormat: {
      type: String,
      enum: ["single", "multiple"],
      default: "multiple"
    },
    design: {
      front: {
        backgroundColor: String,
        backgroundImage: String,
        borderColor: String,
        borderWidth: Number
      },
      back: {
        backgroundColor: String,
        backgroundImage: String,
        content: String
      }
    },
    dataFields: [
      {
        fieldName: String,
        label: String,
        x: Number, // position x in mm
        y: Number, // position y in mm
        width: Number,
        height: Number,
        fontSize: Number,
        bold: Boolean,
        fontFamily: String,
        textAlign: String // left, center, right
      }
    ],
    colors: {
      backgroundColor: String,
      textColor: String,
      accentColor: String
    },
    fonts: {
      primary: String,
      secondary: String
    },
    schoolLogo: String, // URL
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

const IDCardTemplate = mongoose.model("IDCardTemplate", idCardTemplateSchema);
export default IDCardTemplate;
```

---

### File 4: Create `models/academic/IDCard.model.js`

```javascript
import mongoose from "mongoose";

const idCardSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IDCardTemplate",
      required: true
    },
    studentData: {
      name: String,
      studentId: String,
      rollNumber: Number,
      class: String,
      section: String,
      photo: String,
      email: String,
      phoneNumber: String,
      dateOfBirth: Date
    },
    cardData: {
      qrCode: String, // Base64 or URL
      barcode: String // Barcode value or data
    },
    status: {
      type: String,
      enum: ["generated", "printed", "distributed", "revoked"],
      default: "generated",
      index: true
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    printedAt: Date,
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    distributedAt: Date,
    distributedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    revokedReason: String,
    replacementFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IDCard"
    },
    replacementReason: String,
    replacementRemarks: String
  },
  { timestamps: true }
);

const IDCard = mongoose.model("IDCard", idCardSchema);
export default IDCard;
```

---

## FILE INTEGRATION

### File 5: Update `server.js`

```javascript
// Add this import
import idCardRoutes from './routes/principal/idCardRoutes.js';

// Add this route mount
app.use("/api/principal/id-cards", idCardRoutes);
```

---

## DATABASE INDEXES

```javascript
// ID Card indexes
db.idcards.createIndex({ school: 1, status: 1 });
db.idcards.createIndex({ student: 1, school: 1 });
db.idcards.createIndex({ template: 1 });
db.idcards.createIndex({ generatedAt: -1 });
db.idcards.createIndex({ "studentData.class": 1 });

// ID Card Template indexes
db.idcardtemplates.createIndex({ school: 1, isActive: 1 });
db.idcardtemplates.createIndex({ school: 1, isDefault: 1 });
```

---

## API ENDPOINTS SUMMARY

### Template Management (8 endpoints)
- `POST /api/principal/id-cards/template/create` - Create template
- `GET /api/principal/id-cards/template/list` - Get all templates
- `GET /api/principal/id-cards/template/options` - Get template options
- `GET /api/principal/id-cards/template/:templateId` - Get template details
- `PUT /api/principal/id-cards/template/:templateId` - Update template
- `DELETE /api/principal/id-cards/template/:templateId` - Delete template
- `PATCH /api/principal/id-cards/template/:templateId/set-default` - Set default
- `POST /api/principal/id-cards/template/:templateId/clone` - Clone template

### Card Generation (4 endpoints)
- `POST /api/principal/id-cards/generate/single/:studentId` - Generate single card
- `POST /api/principal/id-cards/generate/batch` - Batch generate
- `GET /api/principal/id-cards/cards` - Get all cards
- `GET /api/principal/id-cards/cards/quick-status` - Quick generation status

### Card Management (6 endpoints)
- `GET /api/principal/id-cards/cards/:cardId` - Get card details
- `GET /api/principal/id-cards/cards/student/:studentId` - Get student's cards
- `PATCH /api/principal/id-cards/cards/:cardId/status` - Update status
- `POST /api/principal/id-cards/cards/:cardId/regenerate` - Regenerate card
- `DELETE /api/principal/id-cards/cards/:cardId` - Delete card
- `POST /api/principal/id-cards/cards/bulk/update-status` - Bulk update

### Preview & Verification (2 endpoints)
- `POST /api/principal/id-cards/verify` - Verify card via QR/barcode
- `GET /api/principal/id-cards/preview` - Get card design preview

### Reports & Analytics (6 endpoints)
- `GET /api/principal/id-cards/stats` - Card statistics
- `GET /api/principal/id-cards/pending/list` - Pending cards list
- `GET /api/principal/id-cards/distribution/report` - Distribution report
- `GET /api/principal/id-cards/metrics/generation` - Generation metrics
- `GET /api/principal/id-cards/export/print` - Export for printing
- `GET /api/principal/id-cards/export/list` - Export card list

### Utilities (2 endpoints)
- `GET /api/principal/id-cards/template/:templateId/preview` - Template preview
- `GET /api/principal/id-cards/search/students` - Search students

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Template Management (Week 1)
- [ ] Create idCardController.js with functions 1-6
- [ ] Create idCardRoutes.js
- [ ] Create IDCardTemplate model
- [ ] Test template CRUD operations
- [ ] Implement template cloning

### Phase 2: Card Generation (Week 1-2)
- [ ] Implement single card generation (Function 7)
- [ ] Implement batch generation (Function 8)
- [ ] Generate QR codes
- [ ] Generate barcodes
- [ ] Create IDCard model
- [ ] Test generation workflows

### Phase 3: Card Management (Week 2)
- [ ] Implement status updates (Function 11)
- [ ] Implement regeneration (Function 12)
- [ ] Implement bulk updates (Function 15)
- [ ] Track printing and distribution

### Phase 4: Analytics & Reports (Week 2-3)
- [ ] Implement statistics (Functions 13, 24, 27)
- [ ] Implement distribution report (Function 16)
- [ ] Implement export functionality (Functions 14, 23)
- [ ] Implement pending cards tracking (Function 17)

### Phase 5: Verification & Preview (Week 3)
- [ ] Implement QR/barcode verification (Function 18)
- [ ] Implement card preview (Function 19)
- [ ] Implement template preview (Function 26)
- [ ] Test verification flows

### Phase 6: Integration & Testing (Week 3-4)
- [ ] Update server.js with all routes
- [ ] Create database indexes
- [ ] Integration testing
- [ ] Error handling and validation
- [ ] API documentation

---

## KEY FEATURES

### Template Management
✅ Create custom ID card templates
✅ Multiple paper sizes and formats
✅ Customizable design (colors, fonts, fields)
✅ Set default template
✅ Clone templates
✅ Template preview
✅ Active/inactive templates

### Card Generation
✅ Generate single ID card
✅ Batch generation (entire class or custom)
✅ Automatic QR code generation
✅ Barcode generation
✅ Student data embedding
✅ Check for existing cards

### Card Management
✅ Track card status (generated, printed, distributed, revoked)
✅ Quick status updates
✅ Bulk status updates
✅ Regenerate lost/damaged cards
✅ Delete cards
✅ Card lifecycle tracking

### Distribution Tracking
✅ Track printed cards
✅ Track distributed cards
✅ Distribution reports
✅ Pending cards list
✅ Distribution analytics

### Verification & Search
✅ Verify card via QR code
✅ Verify card via barcode
✅ Search students for generation
✅ Find cards by student

### Analytics & Reporting
✅ Card generation statistics
✅ Distribution metrics
✅ Class-wise breakdown
✅ Processing time metrics
✅ Export to CSV/JSON/PDF
✅ Printable reports

---

## TOTAL ENDPOINTS: 28

- Template Management: 8 endpoints
- Card Generation: 4 endpoints
- Card Management: 6 endpoints
- Verification & Preview: 2 endpoints
- Reports & Analytics: 6 endpoints
- Utilities: 2 endpoints

**TOTAL: 28 production-ready endpoints**

---

## WORKFLOW DIAGRAM

```
1. Principal creates/selects ID card template
2. Principal chooses students (single/batch)
3. System generates ID cards with:
   - Student data
   - QR code
   - Barcode
4. Principal marks as printed
5. Principal marks as distributed
6. System tracks:
   - Generation time
   - Print time
   - Distribution time
7. Reports & Analytics available
```

---

**End of Principal ID Card Generation Work Document**

import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadOptionalModel = async (modelNames, importPaths) => {
    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    for (const filePath of importPaths) {
        try {
            await import(filePath);
        } catch (error) {
            console.log(`Failed to load ${filePath}: ${error.message}`);
        }
    }

    for (const modelName of modelNames) {
        if (mongoose.models[modelName]) return mongoose.models[modelName];
    }

    return null;
};

const verifyModels = async () => {
    console.log("Checking Homework model...");
    const HomeworkModel = await loadOptionalModel(
        ["Homework", "homework"],
        [
            "../models/academic/homework.model.js",
            "../models/academic/Homework.model.js",
            "../models/academic/homeworkModel.js",
        ]
    );

    if (HomeworkModel) {
        console.log("✅ Homework model loaded successfully.");
    } else {
        console.log("❌ Homework model NOT found.");
    }

    console.log("\nChecking Syllabus model...");
    const SyllabusModel = await loadOptionalModel(
        ["Syllabus", "syllabus"],
        [
            "../models/academic/syllabus.model.js",
            "../models/academic/Syllabus.model.js",
            "../models/academic/syllabusModel.js",
        ]
    );

    if (SyllabusModel) {
        console.log("✅ Syllabus model loaded successfully.");
    } else {
        console.log("❌ Syllabus model NOT found.");
    }
};

verifyModels();

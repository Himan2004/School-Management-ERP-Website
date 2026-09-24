import mongoose from 'mongoose';

// @desc    Generate full database JSON backup
// @route   POST /api/graphura/settings/backup
// @access  Private (Graphura Admin)
export const exportDatabaseBackup = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            return res.status(500).json({ success: false, message: "Database connection not established" });
        }

        const collectionsList = await db.listCollections().toArray();
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: "1.0",
                collectionsCount: collectionsList.length
            },
            data: {}
        };

        // Iterate and fetch all documents for each collection
        for (const col of collectionsList) {
            const collectionName = col.name;
            const docs = await db.collection(collectionName).find({}).toArray();
            backupData.data[collectionName] = docs;
        }

        // Return the raw JSON dump to the client to trigger a download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=Graphura_Backup_${new Date().toISOString().split('T')[0]}.json`);
        
        return res.status(200).send(JSON.stringify(backupData));
    } catch (error) {
        console.error("Backup generation error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate database backup",
            error: error.message
        });
    }
};

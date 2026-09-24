// One-time migration: backfill isDeleted/deletedAt on FeeStructure
// documents created before this field existed. Run once, e.g.:
//   node migrateFeeStructureIsDeleted.js
//
// Without this, documents missing `isDeleted` are invisible to queries
// like `{ isDeleted: { $ne: true } }`... actually they DO match $ne:true
// (missing matches $ne:true since it's not equal to true), so the
// app-level guards are safe either way. This migration is about making
// the data consistent/explicit, and about the PARTIAL UNIQUE INDEX,
// which only indexes documents that explicitly satisfy
// { isActive: true, isDeleted: false } — a document missing isDeleted
// is silently excluded from the index entirely, meaning it won't be
// protected against duplicates until backfilled.

import mongoose from 'mongoose';
import FeeStructure from '../controllers/accountant/accountantFeeStructureController';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://anuj:IiUc6OXoWHRiCZvM@ac-ca65kxi-shard-00-00.ikftec6.mongodb.net:27017,ac-ca65kxi-shard-00-01.ikftec6.mongodb.net:27017,ac-ca65kxi-shard-00-02.ikftec6.mongodb.net:27017/?ssl=true&replicaSet=atlas-hx3x2b-shard-0&authSource=admin&appName=Cluster0';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const result = await FeeStructure.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false, deletedAt: null } }
    );

    console.log(`Backfilled ${result.modifiedCount} document(s).`);

    // Optional: report any duplicate (organization, classId, academicYear)
    // groups that are BOTH active and not-deleted, since the index will
    // now actively reject any further writes to whichever one didn't win.
    const dupes = await FeeStructure.aggregate([
        { $match: { isActive: true, isDeleted: false } },
        {
            $group: {
                _id: { organization: '$organization', classId: '$classId', academicYear: '$academicYear' },
                count: { $sum: 1 },
                ids: { $push: '$_id' },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    if (dupes.length > 0) {
        console.warn('Found existing duplicate active structures — resolve these manually:');
        console.warn(JSON.stringify(dupes, null, 2));
    } else {
        console.log('No duplicate active structures found.');
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

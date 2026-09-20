require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI is not set — copy .env.example to .env first');

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();

        console.log('--- Databases ---');
        result.databases.forEach(db => {
            console.log(`- ${db.name}`);
        });
        console.log('-----------------');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();

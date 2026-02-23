const mongoose = require('mongoose');

const uri = 'mongodb+srv://keyurthakkar746kt_db_user:YlqcvTfolBd0OMII@cluster0.vsdletj.mongodb.net/?appName=Cluster0';

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

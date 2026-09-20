require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI is not set — copy .env.example to .env first');

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const patientSchema = new mongoose.Schema({
            email: String,
            password: { type: String, select: true },
            role: String,
        }, { collection: 'patients', strict: false });

        const Patient = mongoose.model('Patient', patientSchema);

        const patients = await Patient.find({}, 'email password role').limit(10);
        console.log('--- Patients List ---');
        patients.forEach(p => {
            console.log(`Email: "${p.email}", Hash Length: ${p.password ? p.password.length : 'N/A'}, Role: ${p.role}`);
        });
        console.log('---------------------');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();

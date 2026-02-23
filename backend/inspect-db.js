const mongoose = require('mongoose');

const uri = 'mongodb+srv://keyurthakkar746kt_db_user:YlqcvTfolBd0OMII@cluster0.vsdletj.mongodb.net/better-you-app?retryWrites=true&w=majority';

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB (better-you-app)');

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

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const Department = require('./models/Department');
const Schedule = require('./models/Schedule');
const Bed = require('./models/Bed');
const Pharmacy = require('./models/Pharmacy');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healhub');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Hospital.deleteMany({}),
      Department.deleteMany({}),
      Schedule.deleteMany({}),
      Bed.deleteMany({}),
      Pharmacy.deleteMany({})
    ]);

    // Create Hospital
    const hospital = await Hospital.create({
      name: 'HealHub General Hospital',
      code: 'HGH001',
      type: 'multispecialty',
      email: 'info@healhub.com',
      phone: '+91-9876543210',
      address: {
        street: '123 Healthcare Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        coordinates: { lat: 19.076, lng: 72.8777 }
      },
      services: ['OPD', 'IPD', 'Emergency', 'Surgery', 'Lab', 'Pharmacy', 'Radiology', 'Teleconsultation'],
      facilities: ['Parking', 'Cafeteria', 'ATM', 'Wheelchair Access', 'WiFi'],
      operatingHours: {
        monday: { open: '08:00', close: '20:00', isOpen: true },
        tuesday: { open: '08:00', close: '20:00', isOpen: true },
        wednesday: { open: '08:00', close: '20:00', isOpen: true },
        thursday: { open: '08:00', close: '20:00', isOpen: true },
        friday: { open: '08:00', close: '20:00', isOpen: true },
        saturday: { open: '08:00', close: '14:00', isOpen: true },
        sunday: { open: '10:00', close: '14:00', isOpen: true }
      },
      beds: {
        icu: { total: 20, available: 15 },
        general: { total: 100, available: 60 },
        emergency: { total: 10, available: 8 },
        pediatric: { total: 15, available: 10 },
        maternity: { total: 10, available: 7 }
      },
      subscription: { plan: 'enterprise', validUntil: new Date('2027-12-31'), maxDoctors: 100, maxPatients: 50000 },
      emergencyServices: true,
      ambulanceAvailable: true
    });

    // Create Departments
    const deptData = [
      { name: 'General Medicine', code: 'GEN', description: 'General medical consultations' },
      { name: 'Cardiology', code: 'CAR', description: 'Heart and cardiovascular care' },
      { name: 'Orthopedics', code: 'ORT', description: 'Bone and joint care' },
      { name: 'Pediatrics', code: 'PED', description: 'Child healthcare' },
      { name: 'Dermatology', code: 'DER', description: 'Skin care and treatment' },
      { name: 'Neurology', code: 'NEU', description: 'Brain and nervous system' },
      { name: 'ENT', code: 'ENT', description: 'Ear, Nose, and Throat' },
      { name: 'Emergency', code: 'EMR', description: 'Emergency medical services' },
      { name: 'Pathology', code: 'PAT', description: 'Clinical pathology and laboratory diagnostics', services: ['Blood Tests', 'Urine Analysis', 'Hormonal Tests', 'Allergy Testing', 'Microbiology', 'Histopathology'] },
      { name: 'Radiology', code: 'RAD', description: 'Diagnostic imaging and radiology services', services: ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography', 'DEXA Scan', 'ECG', 'Echocardiography'] }
    ];

    const departments = await Department.insertMany(deptData.map(d => ({ ...d, hospital: hospital._id })));
    hospital.departments = departments.map(d => d._id);
    await hospital.save();

    // Create Super Admin
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'HealHub',
      email: 'admin@healhub.com',
      phone: '+91-9000000001',
      password: 'admin123',
      role: 'superadmin',
      gender: 'male',
      hospital: hospital._id,
      isVerified: true
    });

    // Create Receptionist
    const receptionist = await User.create({
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'receptionist@healhub.com',
      phone: '+91-9000000002',
      password: 'recep123',
      role: 'receptionist',
      gender: 'female',
      hospital: hospital._id,
      isVerified: true
    });

    // Create Doctors
    const doctorsData = [
      { firstName: 'Rajesh', lastName: 'Kumar', email: 'dr.rajesh@healhub.com', phone: '+91-9000000010', specialization: 'General Medicine', department: departments[0]._id, fee: 500, exp: 15 },
      { firstName: 'Sneha', lastName: 'Patel', email: 'dr.sneha@healhub.com', phone: '+91-9000000011', specialization: 'Cardiology', department: departments[1]._id, fee: 1000, exp: 12 },
      { firstName: 'Amit', lastName: 'Verma', email: 'dr.amit@healhub.com', phone: '+91-9000000012', specialization: 'Orthopedics', department: departments[2]._id, fee: 800, exp: 10 },
      { firstName: 'Meera', lastName: 'Nair', email: 'dr.meera@healhub.com', phone: '+91-9000000013', specialization: 'Pediatrics', department: departments[3]._id, fee: 600, exp: 8 },
      { firstName: 'Vikram', lastName: 'Singh', email: 'dr.vikram@healhub.com', phone: '+91-9000000014', specialization: 'Dermatology', department: departments[4]._id, fee: 700, exp: 9 }
    ];

    const doctors = [];
    for (const dd of doctorsData) {
      const doc = await User.create({
        firstName: dd.firstName,
        lastName: dd.lastName,
        email: dd.email,
        phone: dd.phone,
        password: 'doctor123',
        role: 'doctor',
        gender: dd.firstName === 'Sneha' || dd.firstName === 'Meera' ? 'female' : 'male',
        specialization: dd.specialization,
        qualifications: ['MBBS', 'MD'],
        experience: dd.exp,
        licenseNumber: `MCI-${Math.floor(10000 + Math.random() * 90000)}`,
        consultationFee: dd.fee,
        consultationDuration: 15,
        maxPatientsPerDay: 30,
        departments: [dd.department],
        hospital: hospital._id,
        isVerified: true,
        averageRating: (3.5 + Math.random() * 1.5).toFixed(1)
      });
      doctors.push(doc);

      // Create schedule for each doctor (Mon-Sat)
      for (let day = 1; day <= 6; day++) {
        await Schedule.create({
          doctor: doc._id,
          hospital: hospital._id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: day === 6 ? '14:00' : '17:00',
          slotDuration: 15,
          maxPatients: 30,
          isActive: true,
          consultationType: 'both'
        });
      }
    }

    // Create Patients
    const patientsData = [
      { firstName: 'Rahul', lastName: 'Gupta', email: 'rahul@test.com', phone: '+91-9000000020', gender: 'male', dob: '1990-05-15', blood: 'B+' },
      { firstName: 'Anita', lastName: 'Desai', email: 'anita@test.com', phone: '+91-9000000021', gender: 'female', dob: '1985-08-22', blood: 'O+' },
      { firstName: 'Suresh', lastName: 'Reddy', email: 'suresh@test.com', phone: '+91-9000000022', gender: 'male', dob: '1975-03-10', blood: 'A+' },
      { firstName: 'Kavita', lastName: 'Joshi', email: 'kavita@test.com', phone: '+91-9000000023', gender: 'female', dob: '1992-11-28', blood: 'AB+' },
      { firstName: 'Deepak', lastName: 'Mishra', email: 'deepak@test.com', phone: '+91-9000000024', gender: 'male', dob: '1988-07-03', blood: 'O-' }
    ];

    for (const pd of patientsData) {
      await User.create({
        firstName: pd.firstName,
        lastName: pd.lastName,
        email: pd.email,
        phone: pd.phone,
        password: 'patient123',
        role: 'patient',
        gender: pd.gender,
        dateOfBirth: new Date(pd.dob),
        bloodGroup: pd.blood,
        hospital: hospital._id,
        isVerified: true,
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
      });
    }

    // Create Beds
    const wards = ['icu', 'general', 'emergency', 'pediatric'];
    for (const ward of wards) {
      for (let i = 1; i <= 5; i++) {
        await Bed.create({
          hospital: hospital._id,
          bedNumber: `${ward.toUpperCase()}-${String(i).padStart(3, '0')}`,
          ward,
          floor: ward === 'icu' ? '3' : ward === 'emergency' ? '1' : '2',
          status: i <= 3 ? 'available' : (i === 4 ? 'occupied' : 'maintenance'),
          dailyRate: ward === 'icu' ? 5000 : ward === 'general' ? 1500 : 3000
        });
      }
    }

    // Create Pharmacy
    await Pharmacy.create({
      hospital: hospital._id,
      name: 'HealHub Pharmacy',
      inventory: [
        { medicine: { name: 'Paracetamol', genericName: 'Acetaminophen', manufacturer: 'GSK', category: 'Analgesic', dosageForm: 'tablet' }, batchNumber: 'PCM-001', expiryDate: new Date('2027-06-30'), quantity: 500, price: 15 },
        { medicine: { name: 'Amoxicillin', genericName: 'Amoxicillin', manufacturer: 'Cipla', category: 'Antibiotic', dosageForm: 'capsule' }, batchNumber: 'AMX-001', expiryDate: new Date('2027-03-31'), quantity: 200, price: 45 },
        { medicine: { name: 'Omeprazole', genericName: 'Omeprazole', manufacturer: 'Dr Reddys', category: 'Antacid', dosageForm: 'capsule' }, batchNumber: 'OMP-001', expiryDate: new Date('2027-09-30'), quantity: 300, price: 30 },
        { medicine: { name: 'Cetirizine', genericName: 'Cetirizine', manufacturer: 'Sun Pharma', category: 'Antihistamine', dosageForm: 'tablet' }, batchNumber: 'CTZ-001', expiryDate: new Date('2027-12-31'), quantity: 400, price: 10 },
        { medicine: { name: 'Metformin', genericName: 'Metformin', manufacturer: 'Lupin', category: 'Antidiabetic', dosageForm: 'tablet' }, batchNumber: 'MTF-001', expiryDate: new Date('2027-08-31'), quantity: 250, price: 25 },
        { medicine: { name: 'Amlodipine', genericName: 'Amlodipine', manufacturer: 'Cipla', category: 'Antihypertensive', dosageForm: 'tablet' }, batchNumber: 'AML-001', expiryDate: new Date('2027-05-31'), quantity: 150, price: 35 }
      ]
    });

    console.log('\n✅ Database seeded successfully!\n');
    console.log('📋 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Super Admin:    admin@healhub.com / admin123');
    console.log('👩 Receptionist:   receptionist@healhub.com / recep123');
    console.log('🩺 Doctor:         dr.rajesh@healhub.com / doctor123');
    console.log('🩺 Doctor:         dr.sneha@healhub.com / doctor123');
    console.log('🏥 Patient:        rahul@test.com / patient123');
    console.log('🏥 Patient:        anita@test.com / patient123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

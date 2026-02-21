const router = require('express').Router();
const Pharmacy = require('../models/Pharmacy');
const Prescription = require('../models/Prescription');
const { auth, authorize } = require('../middleware/auth');

// Get pharmacy inventory
router.get('/:hospitalId/inventory', auth, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ hospital: req.params.hospitalId });
    if (!pharmacy) return res.json({ success: true, data: [] });
    res.json({ success: true, data: pharmacy.inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check medicine availability
router.get('/:hospitalId/check-availability', auth, async (req, res) => {
  try {
    const { medicines } = req.query; // comma-separated list
    const medicineList = medicines.split(',').map(m => m.trim());
    const pharmacy = await Pharmacy.findOne({ hospital: req.params.hospitalId });

    if (!pharmacy) return res.json({ success: true, data: { available: false, details: [] } });

    const availability = medicineList.map(med => {
      const item = pharmacy.inventory.find(i =>
        i.medicine.name.toLowerCase() === med.toLowerCase() && i.quantity > 0 && i.isAvailable
      );
      return { medicine: med, available: !!item, quantity: item?.quantity || 0, price: item?.price || 0 };
    });

    res.json({
      success: true,
      data: {
        available: availability.every(a => a.available),
        details: availability
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send prescription to pharmacy
router.post('/order', auth, async (req, res) => {
  try {
    const { prescriptionId, hospitalId } = req.body;
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    let pharmacy = await Pharmacy.findOne({ hospital: hospitalId });
    if (!pharmacy) {
      pharmacy = await Pharmacy.create({ hospital: hospitalId, name: 'Hospital Pharmacy', inventory: [] });
    }

    const items = prescription.medications.map(med => {
      const inventoryItem = pharmacy.inventory.find(i =>
        i.medicine.name.toLowerCase() === med.name.toLowerCase()
      );
      return {
        medicineName: med.name,
        quantity: 1,
        dosage: med.dosage,
        price: inventoryItem?.price || 0,
        isAvailable: inventoryItem ? inventoryItem.quantity > 0 : false
      };
    });

    pharmacy.orders.push({
      prescription: prescriptionId,
      patient: prescription.patient,
      items,
      totalAmount: items.reduce((sum, i) => sum + i.price, 0),
      status: 'received'
    });
    await pharmacy.save();

    prescription.sentToPharmacy = true;
    prescription.pharmacyStatus = 'pending';
    await prescription.save();

    res.json({ success: true, data: pharmacy.orders[pharmacy.orders.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status
router.put('/order/:pharmacyId/:orderId', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });

    const order = pharmacy.orders.id(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = req.body.status;
    if (req.body.status === 'dispensed') order.completedAt = new Date();
    await pharmacy.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update inventory
router.put('/:hospitalId/inventory', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    let pharmacy = await Pharmacy.findOne({ hospital: req.params.hospitalId });
    if (!pharmacy) {
      pharmacy = await Pharmacy.create({ hospital: req.params.hospitalId, name: 'Hospital Pharmacy' });
    }
    pharmacy.inventory = req.body.inventory;
    await pharmacy.save();
    res.json({ success: true, data: pharmacy.inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

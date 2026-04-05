const express = require('express');
const router = express.Router();
const { BloodDonors, BloodRequests, Users, Notifications } = require('../db/store');
const { protect } = require('../middleware/auth');

// ── Seeded hospitals with blood availability ──────────────────────────────────
const BLOOD_HOSPITALS = [
  { _id: 'h1', name: 'AIIMS Blood Bank', city: 'delhi', address: 'Ansari Nagar, New Delhi – 110029', phone: '011-26588500', type: 'Government', available: ['A+','A-','B+','O+','O-','AB+'], timings: '24x7' },
  { _id: 'h2', name: 'Apollo Blood Bank', city: 'delhi', address: 'Sarita Vihar, New Delhi – 110076', phone: '011-29871000', type: 'Private', available: ['A+','B+','AB+','O+'], timings: '8am – 8pm' },
  { _id: 'h3', name: 'Fortis Blood Bank', city: 'mumbai', address: 'Mulund West, Mumbai – 400080', phone: '022-67114000', type: 'Private', available: ['B+','B-','O+','O-','AB-'], timings: '9am – 9pm' },
  { _id: 'h4', name: 'KEM Hospital Blood Bank', city: 'mumbai', address: 'Parel, Mumbai – 400012', phone: '022-24107000', type: 'Government', available: ['A+','A-','B+','B-','O+','O-','AB+','AB-'], timings: '24x7' },
  { _id: 'h5', name: 'Apollo Blood Bank', city: 'hyderabad', address: 'Jubilee Hills, Hyderabad – 500033', phone: '040-23607777', type: 'Private', available: ['A+','O+','B+','AB+'], timings: '8am – 8pm' },
  { _id: 'h6', name: 'Osmania General Blood Bank', city: 'hyderabad', address: 'Afzalgunj, Hyderabad – 500012', phone: '040-24600124', type: 'Government', available: ['A+','A-','O+','O-','B+','B-'], timings: '24x7' },
  { _id: 'h7', name: 'Manipal Hospital Blood Bank', city: 'bangalore', address: 'Old Airport Road, Bangalore – 560017', phone: '080-25024444', type: 'Private', available: ['A+','AB+','O+','B+'], timings: '9am – 6pm' },
  { _id: 'h8', name: 'Victoria Hospital Blood Bank', city: 'bangalore', address: 'K R Market, Bangalore – 560002', phone: '080-26704444', type: 'Government', available: ['A+','A-','B+','B-','O+','O-','AB+','AB-'], timings: '24x7' },
  { _id: 'h9', name: 'PGIMER Blood Bank', city: 'chandigarh', address: 'Sector 12, Chandigarh – 160012', phone: '0172-2747585', type: 'Government', available: ['A+','A-','B+','O+','O-'], timings: '24x7' },
  { _id: 'h10', name: 'Max Hospital Blood Bank', city: 'pune', address: 'Baner, Pune – 411045', phone: '020-66462800', type: 'Private', available: ['A+','B+','O+','AB+'], timings: '8am – 8pm' },
];

// ── GET /api/blood/hospitals ─ search hospitals by city & blood group ──────────
router.get('/hospitals', (req, res) => {
  try {
    const { city, bloodGroup } = req.query;
    let list = [...BLOOD_HOSPITALS];
    if (city) {
      list = list.filter(h => h.city.includes(city.trim().toLowerCase()));
    }
    if (bloodGroup) {
      list = list.filter(h => h.available.includes(bloodGroup));
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blood/donors ─ search donors by blood group and city ──────────────
router.get('/donors', (req, res) => {
  try {
    const { city, bloodGroup } = req.query;
    let list = BloodDonors.find({ available: true });

    if (city) {
      list = list.filter(d => d.city.includes(city.trim().toLowerCase()));
    }
    if (bloodGroup) {
      list = list.filter(d => d.bloodGroup === bloodGroup);
    }

    // Enrich with user info, strip sensitive fields
    const enriched = list.map(d => {
      const u = Users.findById(d.userId);
      return {
        _id: d._id,
        userId: d.userId,
        name: d.name,
        bloodGroup: d.bloodGroup,
        city: d.city,
        phone: d.phone,
        available: d.available,
        lastDonated: d.lastDonated,
        avatar: u ? u.avatar : null,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blood/my-donor-profile ─ get current user's donor profile ─────────
router.get('/my-donor-profile', protect, (req, res) => {
  try {
    const profile = BloodDonors.findByUserId(req.user._id);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/blood/donors ─ register / update donor profile ───────────────────
router.post('/donors', protect, (req, res) => {
  try {
    const { bloodGroup, city, phone, available, lastDonated } = req.body;
    if (!bloodGroup || !city) {
      return res.status(400).json({ message: 'Blood group and city are required.' });
    }
    const profile = BloodDonors.create({
      userId: req.user._id,
      name: req.user.name,
      bloodGroup,
      city: city.trim().toLowerCase(),
      phone: phone || '',
      available: available !== false,
      lastDonated: lastDonated || null,
    });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/blood/donors/toggle ─ toggle availability ─────────────────────
router.patch('/donors/toggle', protect, (req, res) => {
  try {
    const profile = BloodDonors.findByUserId(req.user._id);
    if (!profile) return res.status(404).json({ message: 'Donor profile not found.' });
    const updated = BloodDonors.findByIdAndUpdate(profile._id, { available: !profile.available });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/blood/request/:donorId ─ send a blood request to a donor ─────────
router.post('/request/:donorId', protect, (req, res) => {
  try {
    const donor = BloodDonors.findById(req.params.donorId);
    if (!donor) return res.status(404).json({ message: 'Donor not found.' });
    if (donor.userId === req.user._id) return res.status(400).json({ message: 'You cannot request from yourself.' });
    if (!donor.available) return res.status(400).json({ message: 'This donor is currently unavailable.' });

    const { message, bloodGroup } = req.body;
    const bloodReq = BloodRequests.create({
      recipientId: req.user._id,
      recipientName: req.user.name,
      donorId: donor.userId,
      donorName: donor.name,
      bloodGroup: bloodGroup || donor.bloodGroup,
      message: message || '',
    });

    // Notify the donor
    Notifications.create({
      userId: donor.userId,
      text: `🩸 ${req.user.name} needs your help! Blood group ${donor.bloodGroup} — see Blood SOS requests.`,
      link: '/blood-sos',
    });

    res.status(201).json(bloodReq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blood/requests ─ get my inbound + outbound requests ───────────────
router.get('/requests', protect, (req, res) => {
  try {
    const inbound  = BloodRequests.find({ donorId: req.user._id });
    const outbound = BloodRequests.find({ recipientId: req.user._id });

    const enrich = (r) => {
      const donorProfile    = BloodDonors.findByUserId(r.donorId);
      const recipientProfile = BloodDonors.findByUserId(r.recipientId);
      return {
        ...r,
        recipientName: recipientProfile ? recipientProfile.name : (r.recipientName || 'User'),
        donorName:     donorProfile     ? donorProfile.name     : (r.donorName     || 'Donor'),
        donorPhone:    donorProfile ? donorProfile.phone : '',
      };
    };

    res.json({
      inbound:  inbound.map(enrich).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      outbound: outbound.map(enrich).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/blood/request/:id/accept ───────────────────────────────────────
router.patch('/request/:id/accept', protect, (req, res) => {
  try {
    const r = BloodRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found.' });
    if (r.donorId !== req.user._id) return res.status(403).json({ message: 'Not your request.' });
    if (r.status !== 'pending') return res.status(400).json({ message: 'Request already actioned.' });

    const updated = BloodRequests.findByIdAndUpdate(req.params.id, { status: 'accepted' });

    Notifications.create({
      userId: r.recipientId,
      text: `✅ Your blood request was accepted! You can now chat with the donor in Blood SOS.`,
      link: '/blood-sos',
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/blood/request/:id/decline ──────────────────────────────────────
router.patch('/request/:id/decline', protect, (req, res) => {
  try {
    const r = BloodRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found.' });
    if (r.donorId !== req.user._id) return res.status(403).json({ message: 'Not your request.' });

    const updated = BloodRequests.findByIdAndUpdate(req.params.id, { status: 'declined' });

    Notifications.create({
      userId: r.recipientId,
      text: `❌ Your blood request was declined. Please try another donor in Blood SOS.`,
      link: '/blood-sos',
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blood/chat/:requestId ─ get full request with messages ───────────
router.get('/chat/:requestId', protect, (req, res) => {
  try {
    const r = BloodRequests.findById(req.params.requestId);
    if (!r) return res.status(404).json({ message: 'Chat not found.' });
    if (r.recipientId !== req.user._id && r.donorId !== req.user._id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (r.status !== 'accepted') return res.status(400).json({ message: 'Chat only available after acceptance.' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/blood/chat/:requestId ─ send a message ─────────────────────────
router.post('/chat/:requestId', protect, (req, res) => {
  try {
    const r = BloodRequests.findById(req.params.requestId);
    if (!r) return res.status(404).json({ message: 'Chat not found.' });
    if (r.recipientId !== req.user._id && r.donorId !== req.user._id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (r.status !== 'accepted') return res.status(400).json({ message: 'Chat only available after acceptance.' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text required.' });

    const updated = BloodRequests.addMessage(req.params.requestId, {
      senderId: req.user._id,
      senderName: req.user.name,
      text: text.trim(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

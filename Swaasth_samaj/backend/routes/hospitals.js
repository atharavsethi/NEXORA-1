const express = require('express');
const router = express.Router();

// Haversine formula to calculate distance in km between two lat/lng coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance.toFixed(1);
}

// Mock hospital data — 10 entries across India
const HOSPITALS = [
  { id: 1, name: 'AIIMS Delhi', type: 'Government Hospital', specialty: 'Multi-specialty', address: 'Ansari Nagar, New Delhi', lat: 28.5672, lng: 77.2100, phone: '011-26588500', emergency: true, bloodBank: true, rating: 4.8 },
  { id: 2, name: 'Fortis Hospital Vasant Kunj', type: 'Private Hospital', specialty: 'Cardiology & Oncology', address: 'Vasant Kunj, New Delhi', lat: 28.5245, lng: 77.1586, phone: '011-42776222', emergency: true, bloodBank: true, rating: 4.5 },
  { id: 3, name: 'Apollo Hospital', type: 'Private Hospital', specialty: 'Multi-specialty', address: 'Sarita Vihar, New Delhi', lat: 28.5424, lng: 77.2874, phone: '011-71791090', emergency: true, bloodBank: true, rating: 4.7 },
  { id: 4, name: 'Max Super Speciality', type: 'Private Hospital', specialty: 'Neurology & Orthopedics', address: 'Saket, New Delhi', lat: 28.5265, lng: 77.2162, phone: '011-26515050', emergency: true, bloodBank: false, rating: 4.4 },
  { id: 5, name: 'Safdarjung Hospital', type: 'Government Hospital', specialty: 'Trauma & Emergency', address: 'Safdarjung, New Delhi', lat: 28.5695, lng: 77.2060, phone: '011-26730000', emergency: true, bloodBank: true, rating: 4.2 },
  { id: 6, name: 'City Clinic & Diagnostics', type: 'Clinic', specialty: 'General Medicine', address: 'Lajpat Nagar, New Delhi', lat: 28.5677, lng: 77.2358, phone: '011-29834410', emergency: false, bloodBank: false, rating: 4.0 },
  { id: 7, name: 'RML Hospital', type: 'Government Hospital', specialty: 'Multi-specialty', address: 'Baba Kharak Singh Marg', lat: 28.6265, lng: 77.2018, phone: '011-23365525', emergency: true, bloodBank: true, rating: 4.1 },
  { id: 8, name: 'Medanta The Medicity', type: 'Private Hospital', specialty: 'Cardiac Sciences', address: 'Sector 38, Gurugram', lat: 28.4412, lng: 77.0308, phone: '0124-4141414', emergency: true, bloodBank: true, rating: 4.9 },
  { id: 9, name: 'Holy Family Hospital', type: 'Private Hospital', specialty: 'Obstetrics & Gynecology', address: 'Okhla, New Delhi', lat: 28.5490, lng: 77.2710, phone: '011-26845100', emergency: true, bloodBank: false, rating: 4.3 },
  { id: 10, name: 'Primus Super Speciality', type: 'Private Hospital', specialty: 'Orthopedics & Spine', address: 'Chandragupta Marg, Chanakyapuri', lat: 28.5936, lng: 77.1840, phone: '011-66206620', emergency: false, bloodBank: false, rating: 4.6 },
];

const BLOOD_DONORS = [
  { id: 1, name: 'Rahul Singh', bloodGroup: 'A+', location: 'Lajpat Nagar', lastDonated: '3 months ago', available: true, phone: '+91-98100-12345' },
  { id: 2, name: 'Priya Sharma', bloodGroup: 'O-', location: 'Vasant Kunj', lastDonated: '6 weeks ago', available: true, phone: '+91-99110-54321' },
  { id: 3, name: 'Amit Kumar', bloodGroup: 'B+', location: 'Saket', lastDonated: '2 months ago', available: true, phone: '+91-88001-67890' },
  { id: 4, name: 'Sunita Devi', bloodGroup: 'AB+', location: 'Dwarka', lastDonated: '4 months ago', available: true, phone: '+91-77770-98765' },
  { id: 5, name: 'Ravi Patel', bloodGroup: 'O+', location: 'Rohini', lastDonated: '5 weeks ago', available: false, phone: '+91-96320-11223' },
  { id: 6, name: 'Kavita Nair', bloodGroup: 'A-', location: 'Mayur Vihar', lastDonated: '8 weeks ago', available: true, phone: '+91-91234-56789' },
];

// GET /api/hospitals
router.get('/', (req, res) => {
  const { type, emergency, bloodBank, userLat, userLng } = req.query;
  
  // Clone data and add distance
  let result = HOSPITALS.map(h => {
    let dist = "N/A";
    if (userLat && userLng) {
      dist = calculateDistance(parseFloat(userLat), parseFloat(userLng), h.lat, h.lng);
    } else {
      // Mock static distance if location is denied so UI doesn't break
      dist = (Math.random() * 10 + 1).toFixed(1); 
    }
    return { ...h, distance: dist };
  });

  if (type) result = result.filter(h => h.type.toLowerCase().includes(type.toLowerCase()));
  if (emergency === 'true') result = result.filter(h => h.emergency);
  if (bloodBank === 'true') result = result.filter(h => h.bloodBank);
  
  // Sort by closest distance
  result.sort((a, b) => {
    return parseFloat(a.distance) - parseFloat(b.distance);
  });
  
  res.json(result);
});

// GET /api/hospitals/blood-donors
router.get('/blood-donors', (req, res) => {
  const { bloodGroup } = req.query;
  let result = [...BLOOD_DONORS];
  if (bloodGroup) result = result.filter(d => d.bloodGroup === bloodGroup);
  res.json(result);
});

module.exports = router;

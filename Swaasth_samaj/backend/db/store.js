/**
 * Pure in-memory data store — no MongoDB needed.
 * Mimics a simple Mongoose-like API so routes need minimal changes.
 * Data resets on server restart (acceptable for MVP/hackathon).
 */

const { v4: uuid } = require('uuid');

// ── Collections ──────────────────────────────────────────────────────────────
const users         = new Map();
const questions     = new Map();
const answers       = new Map();
const ratings       = new Map(); // doctorId -> [{ userId, stars, comment, date }]
const slots         = new Map(); // doctor availability slots
const consultations = new Map(); // paid consultation requests
const chatRequests  = new Map(); // private paid chat requests
const chatMessages  = new Map(); // messages inside a chat room
const faqs          = new Map(); // global FAQs
const supportTickets= new Map(); // user help & support tickets
const notifications = new Map(); // user notifications
const bloodDonors   = new Map(); // Blood SOS donor registrations
const bloodRequests = new Map(); // Blood SOS request/chat sessions

// ── Generic helpers ───────────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }

function cloneDoc(doc) {
  if (!doc) return null;
  return { ...doc };
}

function applyFilter(map, filter = {}) {
  const results = [];
  for (const doc of map.values()) {
    let match = true;
    for (const [key, val] of Object.entries(filter)) {
      // Support simple $in queries
      if (val && typeof val === 'object' && val.$in) {
        if (!val.$in.includes(doc[key])) { match = false; break; }
      } else if (val && typeof val === 'object' && val.$regex) {
        const rx = new RegExp(val.$regex, val.$options || '');
        if (!rx.test(doc[key] || '')) { match = false; break; }
      } else {
        if (doc[key] !== val) { match = false; break; }
      }
    }
    if (match) results.push(cloneDoc(doc));
  }
  return results;
}

// ── Users ─────────────────────────────────────────────────────────────────────
const Users = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      name: data.name,
      email: (data.email || '').toLowerCase(),
      password: data.password,
      role: data.role || 'user',
      verified: data.role === 'user' || data.role === 'admin' ? true : (data.verified || false),
      specialty: data.specialty || '',
      institution: data.institution || '',
      bio: data.bio || '',
      avatar: data.avatar || null,
      credentialUrl: data.credentialUrl || null,
      experience: data.experience || '',
      licenseNumber: data.licenseNumber || '',  // doctor MBBS/Gov ID
      studentId: data.studentId || '',           // student college ID
      college: data.college || '',
      yearOfStudy: data.yearOfStudy || '',
      gender: data.gender || '',
      age: data.age || '',
      bloodGroup: data.bloodGroup || '',
      phone: data.phone || '',
      rating: data.rating || 0,
      reviewCount: data.reviewCount || 0,
      questionsCount: 0,
      answersCount: 0,
      online: false,
      patientCount: data.patientCount || 0,
      responseTime: data.responseTime || '< 1 hr',
      consultationFee: data.consultationFee || 0, // in INR
      createdAt: now(),
      updatedAt: now(),
    };
    users.set(id, doc);
    return cloneDoc(doc);
  },

  findOne(filter) {
    const results = applyFilter(users, filter);
    return results[0] || null;
  },

  findById(id) {
    return cloneDoc(users.get(id)) || null;
  },

  find(filter = {}) {
    return applyFilter(users, filter);
  },

  findByIdAndUpdate(id, update, opts = {}) {
    const doc = users.get(id);
    if (!doc) return null;
    // Handle $inc
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
      delete update.$inc;
    }
    Object.assign(doc, update, { updatedAt: now() });
    users.set(id, doc);
    return opts.new !== false ? cloneDoc(doc) : cloneDoc(doc);
  },

  save(id, data) {
    const doc = users.get(id);
    if (!doc) return null;
    Object.assign(doc, data, { updatedAt: now() });
    users.set(id, doc);
    return cloneDoc(doc);
  },

  countDocuments(filter = {}) {
    return applyFilter(users, filter).length;
  },
};

// ── Questions ─────────────────────────────────────────────────────────────────
const Questions = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      title: data.title,
      description: data.description || '',
      category: data.category || 'General',
      userId: data.userId,
      imageUrl: data.imageUrl || null,
      status: 'open',
      upvotes: [],
      views: 0,
      answersCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    questions.set(id, doc);
    // bump user question count
    const u = users.get(data.userId);
    if (u) { u.questionsCount = (u.questionsCount || 0) + 1; users.set(data.userId, u); }
    return cloneDoc(doc);
  },

  findOne(filter) {
    return applyFilter(questions, filter)[0] || null;
  },

  findById(id) {
    return cloneDoc(questions.get(id)) || null;
  },

  find(filter = {}) {
    return applyFilter(questions, filter);
  },

  findByIdAndUpdate(id, update, opts = {}) {
    const doc = questions.get(id);
    if (!doc) return null;
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
      delete update.$inc;
    }
    Object.assign(doc, update, { updatedAt: now() });
    questions.set(id, doc);
    return cloneDoc(doc);
  },

  save(id, data) {
    const doc = questions.get(id);
    if (!doc) return null;
    Object.assign(doc, data, { updatedAt: now() });
    questions.set(id, doc);
    return cloneDoc(doc);
  },

  countDocuments(filter = {}) {
    return applyFilter(questions, filter).length;
  },

  deleteOne(id) {
    questions.delete(id);
  },
};

// ── Answers ───────────────────────────────────────────────────────────────────
const Answers = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      questionId: data.questionId,
      doctorId: data.doctorId,
      text: data.text,
      status: 'pending',
      upvotes: [],
      flagged: false,
      adminNote: '',
      createdAt: now(),
      updatedAt: now(),
    };
    answers.set(id, doc);
    // bump doctor answer count
    const u = users.get(data.doctorId);
    if (u) { u.answersCount = (u.answersCount || 0) + 1; users.set(data.doctorId, u); }
    return cloneDoc(doc);
  },

  findOne(filter) {
    return applyFilter(answers, filter)[0] || null;
  },

  findById(id) {
    return cloneDoc(answers.get(id)) || null;
  },

  find(filter = {}) {
    return applyFilter(answers, filter);
  },

  findByIdAndUpdate(id, update, opts = {}) {
    const doc = answers.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    answers.set(id, doc);
    return cloneDoc(doc);
  },

  save(id, data) {
    const doc = answers.get(id);
    if (!doc) return null;
    Object.assign(doc, data, { updatedAt: now() });
    answers.set(id, doc);
    return cloneDoc(doc);
  },

  countDocuments(filter = {}) {
    return applyFilter(answers, filter).length;
  },

  deleteOne(id) {
    answers.delete(id);
  },
};

// ── Ratings ───────────────────────────────────────────────────────────────────
const Ratings = {
  add(doctorId, userId, stars, comment = '') {
    if (!ratings.has(doctorId)) ratings.set(doctorId, []);
    const list = ratings.get(doctorId);
    // Prevent duplicate rating from same user
    const existing = list.findIndex(r => r.userId === userId);
    const entry = { userId, stars, comment, date: now() };
    if (existing >= 0) list[existing] = entry;
    else list.push(entry);
    // Recalculate doctor avg rating
    const avg = list.reduce((s, r) => s + r.stars, 0) / list.length;
    const doc = users.get(doctorId);
    if (doc) {
      doc.rating = Math.round(avg * 10) / 10;
      doc.reviewCount = list.length;
      users.set(doctorId, doc);
    }
    return entry;
  },

  getForDoctor(doctorId) {
    const list = ratings.get(doctorId) || [];
    return list.map(r => ({
      ...r,
      user: users.get(r.userId) ? { name: users.get(r.userId).name, avatar: users.get(r.userId).avatar } : { name: 'Anonymous' }
    }));
  },
};

// ── Slots ─────────────────────────────────────────────────────────────────────
// Doctor availability: { _id, doctorId, day, startTime, endTime, fee, duration, isBooked }
const Slots = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      doctorId: data.doctorId,
      day: data.day,           // e.g. "Monday" or "2024-04-10"
      startTime: data.startTime, // e.g. "10:00"
      endTime: data.endTime,     // e.g. "10:30"
      fee: data.fee || 0,        // in INR
      duration: data.duration || 30, // minutes
      isBooked: false,
      createdAt: now(),
      updatedAt: now(),
    };
    slots.set(id, doc);
    return cloneDoc(doc);
  },

  findById(id) {
    return cloneDoc(slots.get(id)) || null;
  },

  find(filter = {}) {
    return applyFilter(slots, filter);
  },

  findByIdAndUpdate(id, update) {
    const doc = slots.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    slots.set(id, doc);
    return cloneDoc(doc);
  },

  deleteOne(id) {
    slots.delete(id);
  },
};

// ── Consultations ─────────────────────────────────────────────────────────────
// Paid consultation request lifecycle:
// pending_payment -> payment_done -> accepted | rejected -> completed
const Consultations = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      patientId: data.patientId,
      doctorId: data.doctorId,
      slotId: data.slotId,
      slotDay: data.slotDay,
      slotTime: data.slotTime,
      fee: data.fee,
      symptoms: data.symptoms || '',
      status: 'pending_payment', // pending_payment | payment_done | accepted | rejected | completed
      paymentId: null,          // simulated payment reference
      doctorMessage: '',         // doctor's response message
      meetLink: '',              // doctor can provide video/meet link
      createdAt: now(),
      updatedAt: now(),
    };
    consultations.set(id, doc);
    return cloneDoc(doc);
  },

  findById(id) {
    return cloneDoc(consultations.get(id)) || null;
  },

  find(filter = {}) {
    return applyFilter(consultations, filter);
  },

  findByIdAndUpdate(id, update) {
    const doc = consultations.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    consultations.set(id, doc);
    return cloneDoc(doc);
  },
};

// ── Chat Requests ─────────────────────────────────────────────────────────────
// Private paid chat lifecycle:
// pending -> slot_proposed -> payment_done -> active -> completed | rejected
const ChatRequests = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      patientId:     data.patientId,
      doctorId:      data.doctorId,
      concern:       data.concern || '',
      preferredDay:  data.preferredDay  || '',
      preferredTime: data.preferredTime || '',
      status:        'pending', // pending | slot_proposed | payment_done | active | completed | rejected
      proposedDay:   '',
      proposedTime:  '',
      fee:           0,
      duration:      30,
      doctorNote:    '',
      paymentId:     null,
      closedAt:      null,
      createdAt:     now(),
      updatedAt:     now(),
    };
    chatRequests.set(id, doc);
    return cloneDoc(doc);
  },

  findById(id) { return cloneDoc(chatRequests.get(id)) || null; },

  find(filter = {}) { return applyFilter(chatRequests, filter); },

  findByIdAndUpdate(id, update) {
    const doc = chatRequests.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    chatRequests.set(id, doc);
    return cloneDoc(doc);
  },
};

// ── Chat Messages ─────────────────────────────────────────────────────────────
const ChatMessages = {
  create(data) {
    const id = uuid();
    const doc = {
      _id:        id,
      chatId:     data.chatId,
      senderId:   data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      text:       data.text,
      createdAt:  now(),
    };
    chatMessages.set(id, doc);
    return cloneDoc(doc);
  },

  find(filter = {}) { return applyFilter(chatMessages, filter); },
};

// ── FAQs ──────────────────────────────────────────────────────────────────────
const Faqs = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      question: data.question,
      answer: data.answer,
      category: data.category || 'General',
      order: data.order || 0,
      createdAt: now(),
    };
    faqs.set(id, doc);
    return cloneDoc(doc);
  },
  find(filter = {}) {
    const results = applyFilter(faqs, filter);
    return results.sort((a,b) => a.order - b.order);
  }
};

// ── Support Tickets ───────────────────────────────────────────────────────────
const SupportTickets = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      userId: data.userId,
      subject: data.subject,
      message: data.message,
      status: 'pending', // pending | in_progress | resolved
      response: '',      // admin response
      createdAt: now(),
      updatedAt: now(),
    };
    supportTickets.set(id, doc);
    return cloneDoc(doc);
  },
  findById(id) { return cloneDoc(supportTickets.get(id)) || null; },
  find(filter = {}) { return applyFilter(supportTickets, filter); },
  findByIdAndUpdate(id, update) {
    const doc = supportTickets.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    supportTickets.set(id, doc);
    return cloneDoc(doc);
  }
};

// ── Lounge Posts (Doctor/Student Lounge) ──────────────────────────────────────
const loungePosts = new Map();
const LoungePosts = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      title: data.title,
      description: data.description || '',
      category: data.category || 'General',
      authorId: data.authorId,
      authorRole: data.authorRole, // 'doctor' or 'student'
      status: 'open',
      upvotes: [],
      views: 0,
      repliesCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    loungePosts.set(id, doc);
    return cloneDoc(doc);
  },
  findById(id) { return cloneDoc(loungePosts.get(id)) || null; },
  find(filter = {}) { return applyFilter(loungePosts, filter); },
  findByIdAndUpdate(id, update) {
    const doc = loungePosts.get(id);
    if (!doc) return null;
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
      delete update.$inc;
    }
    Object.assign(doc, update, { updatedAt: now() });
    loungePosts.set(id, doc);
    return cloneDoc(doc);
  },
  deleteOne(id) { loungePosts.delete(id); },
};

// ── Lounge Replies ────────────────────────────────────────────────────────────
const loungeReplies = new Map();
const LoungeReplies = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      postId: data.postId,
      authorId: data.authorId,
      text: data.text,
      upvotes: [],
      createdAt: now(),
      updatedAt: now(),
    };
    loungeReplies.set(id, doc);
    // Bump reply count
    const post = loungePosts.get(data.postId);
    if (post) { post.repliesCount = (post.repliesCount || 0) + 1; loungePosts.set(data.postId, post); }
    return cloneDoc(doc);
  },
  find(filter = {}) { return applyFilter(loungeReplies, filter); },
  findByIdAndUpdate(id, update) {
    const doc = loungeReplies.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    loungeReplies.set(id, doc);
    return cloneDoc(doc);
  },
  deleteOne(id) { loungeReplies.delete(id); },
};

// ── Notifications ─────────────────────────────────────────────────────────────
const Notifications = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      userId: data.userId,
      text: data.text,
      link: data.link || '',
      read: false,
      createdAt: now(),
    };
    notifications.set(id, doc);
    return cloneDoc(doc);
  },
  find(filter = {}) { return applyFilter(notifications, filter); },
  findByIdAndUpdate(id, update) {
    const doc = notifications.get(id);
    if (!doc) return null;
    Object.assign(doc, update);
    notifications.set(id, doc);
    return cloneDoc(doc);
  },
  markAllRead(userId) {
    for (const doc of notifications.values()) {
      if (doc.userId === userId && !doc.read) {
        doc.read = true;
        notifications.set(doc._id, doc);
      }
    }
  }
};

// ── Blood Donors ──────────────────────────────────────────────────────────────
const BloodDonors = {
  create(data) {
    // one donor profile per user — upsert by userId
    const existing = [...bloodDonors.values()].find(d => d.userId === data.userId);
    if (existing) {
      Object.assign(existing, { ...data, updatedAt: now() });
      bloodDonors.set(existing._id, existing);
      return cloneDoc(existing);
    }
    const id = uuid();
    const doc = {
      _id: id,
      userId: data.userId,
      name: data.name,
      bloodGroup: data.bloodGroup,
      city: (data.city || '').trim().toLowerCase(),
      phone: data.phone || '',
      available: data.available !== false,
      lastDonated: data.lastDonated || null,
      createdAt: now(),
      updatedAt: now(),
    };
    bloodDonors.set(id, doc);
    return cloneDoc(doc);
  },
  findByUserId(userId) {
    return cloneDoc([...bloodDonors.values()].find(d => d.userId === userId)) || null;
  },
  find(filter = {}) { return applyFilter(bloodDonors, filter); },
  findById(id) { return cloneDoc(bloodDonors.get(id)) || null; },
  findByIdAndUpdate(id, update) {
    const doc = bloodDonors.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    bloodDonors.set(id, doc);
    return cloneDoc(doc);
  },
};

// ── Blood Requests ────────────────────────────────────────────────────────────
const BloodRequests = {
  create(data) {
    const id = uuid();
    const doc = {
      _id: id,
      recipientId: data.recipientId,
      donorId: data.donorId,
      bloodGroup: data.bloodGroup,
      message: data.message || '',
      status: 'pending', // pending | accepted | declined
      messages: [],      // in-app chat messages after acceptance
      createdAt: now(),
      updatedAt: now(),
    };
    bloodRequests.set(id, doc);
    return cloneDoc(doc);
  },
  find(filter = {}) { return applyFilter(bloodRequests, filter); },
  findById(id) { return cloneDoc(bloodRequests.get(id)) || null; },
  findByIdAndUpdate(id, update) {
    const doc = bloodRequests.get(id);
    if (!doc) return null;
    Object.assign(doc, update, { updatedAt: now() });
    bloodRequests.set(id, doc);
    return cloneDoc(doc);
  },
  addMessage(id, msg) {
    const doc = bloodRequests.get(id);
    if (!doc) return null;
    const message = { _id: uuid(), ...msg, createdAt: now() };
    doc.messages.push(message);
    doc.updatedAt = now();
    bloodRequests.set(id, doc);
    return cloneDoc(doc);
  },
};

module.exports = { 
  Users, Questions, Answers, Ratings, Slots, Consultations, 
  ChatRequests, ChatMessages, Faqs, SupportTickets, 
  LoungePosts, LoungeReplies, Notifications,
  BloodDonors, BloodRequests,
  users, questions, answers, notifications
};

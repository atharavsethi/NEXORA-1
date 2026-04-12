"""
In-memory data store — direct Python port of backend/db/store.js
Data resets on server restart (acceptable for MVP).
All collections use Python dicts keyed by UUID string.
"""
import uuid
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uuid():
    return str(uuid.uuid4())


def _clone(doc):
    if doc is None:
        return None
    return dict(doc)


def _apply_filter(collection: dict, filter_: dict):
    results = []
    for doc in collection.values():
        match = True
        for key, val in filter_.items():
            if isinstance(val, dict) and '$in' in val:
                if doc.get(key) not in val['$in']:
                    match = False
                    break
            elif isinstance(val, dict) and '$regex' in val:
                import re
                flags = re.IGNORECASE if val.get('$options', '') == 'i' else 0
                if not re.search(val['$regex'], doc.get(key) or '', flags):
                    match = False
                    break
            else:
                if doc.get(key) != val:
                    match = False
                    break
        if match:
            results.append(_clone(doc))
    return results


# ── Raw collections ───────────────────────────────────────────────────────────
_users = {}
_questions = {}
_answers = {}
_ratings = {}          # doctorId -> list of {userId, stars, comment, date}
_slots = {}
_consultations = {}
_chat_requests = {}
_chat_messages = {}
_faqs = {}
_support_tickets = {}
_lounge_posts = {}
_lounge_replies = {}
_notifications = {}
_blood_donors = {}
_blood_requests = {}


# ── Users ─────────────────────────────────────────────────────────────────────
class _Users:
    def create(self, data):
        id_ = _uuid()
        role = data.get('role', 'user')
        doc = {
            '_id': id_,
            'name': data['name'],
            'email': (data.get('email') or '').lower(),
            'password': data['password'],
            'role': role,
            'verified': True if role in ('user', 'admin') else data.get('verified', False),
            'specialty': data.get('specialty', ''),
            'institution': data.get('institution', ''),
            'bio': data.get('bio', ''),
            'avatar': data.get('avatar', None),
            'credentialUrl': data.get('credentialUrl', None),
            'experience': data.get('experience', ''),
            'licenseNumber': data.get('licenseNumber', ''),
            'studentId': data.get('studentId', ''),
            'college': data.get('college', ''),
            'yearOfStudy': data.get('yearOfStudy', ''),
            'gender': data.get('gender', ''),
            'age': data.get('age', ''),
            'bloodGroup': data.get('bloodGroup', ''),
            'phone': data.get('phone', ''),
            'rating': data.get('rating', 0),
            'reviewCount': data.get('reviewCount', 0),
            'questionsCount': 0,
            'answersCount': 0,
            'online': data.get('online', False),
            'patientCount': data.get('patientCount', 0),
            'responseTime': data.get('responseTime', '< 1 hr'),
            'consultationFee': data.get('consultationFee', 0),
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _users[id_] = doc
        return _clone(doc)

    def find_one(self, filter_):
        results = _apply_filter(_users, filter_)
        return results[0] if results else None

    def find_by_id(self, id_):
        return _clone(_users.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_users, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _users.get(id_)
        if not doc:
            return None
        if '$inc' in update:
            for k, v in update['$inc'].items():
                doc[k] = (doc.get(k) or 0) + v
            update = {k: v for k, v in update.items() if k != '$inc'}
        doc.update(update)
        doc['updatedAt'] = _now()
        _users[id_] = doc
        return _clone(doc)

    def count_documents(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return len(_apply_filter(_users, filter_))


# ── Questions ─────────────────────────────────────────────────────────────────
class _Questions:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'title': data['title'],
            'description': data.get('description', ''),
            'category': data.get('category', 'General'),
            'userId': data['userId'],
            'imageUrl': data.get('imageUrl', None),
            'status': 'open',
            'upvotes': [],
            'views': 0,
            'answersCount': 0,
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _questions[id_] = doc
        u = _users.get(data['userId'])
        if u:
            u['questionsCount'] = (u.get('questionsCount') or 0) + 1
            _users[data['userId']] = u
        return _clone(doc)

    def find_one(self, filter_):
        results = _apply_filter(_questions, filter_)
        return results[0] if results else None

    def find_by_id(self, id_):
        return _clone(_questions.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_questions, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _questions.get(id_)
        if not doc:
            return None
        if '$inc' in update:
            for k, v in update['$inc'].items():
                doc[k] = (doc.get(k) or 0) + v
            update = {k: v for k, v in update.items() if k != '$inc'}
        doc.update(update)
        doc['updatedAt'] = _now()
        _questions[id_] = doc
        return _clone(doc)

    def count_documents(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return len(_apply_filter(_questions, filter_))

    def delete_one(self, id_):
        _questions.pop(id_, None)


# ── Answers ───────────────────────────────────────────────────────────────────
class _Answers:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'questionId': data['questionId'],
            'doctorId': data['doctorId'],
            'text': data['text'],
            'status': data.get('status', 'approved'),
            'upvotes': [],
            'flagged': False,
            'adminNote': '',
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _answers[id_] = doc
        u = _users.get(data['doctorId'])
        if u:
            u['answersCount'] = (u.get('answersCount') or 0) + 1
            _users[data['doctorId']] = u
        return _clone(doc)

    def find_one(self, filter_):
        results = _apply_filter(_answers, filter_)
        return results[0] if results else None

    def find_by_id(self, id_):
        return _clone(_answers.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_answers, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _answers.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _answers[id_] = doc
        return _clone(doc)

    def count_documents(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return len(_apply_filter(_answers, filter_))

    def delete_one(self, id_):
        _answers.pop(id_, None)


# ── Ratings ───────────────────────────────────────────────────────────────────
class _Ratings:
    def add(self, doctor_id, user_id, stars, comment=''):
        if doctor_id not in _ratings:
            _ratings[doctor_id] = []
        lst = _ratings[doctor_id]
        existing = next((i for i, r in enumerate(lst) if r['userId'] == user_id), -1)
        entry = {'userId': user_id, 'stars': stars, 'comment': comment, 'date': _now()}
        if existing >= 0:
            lst[existing] = entry
        else:
            lst.append(entry)
        avg = sum(r['stars'] for r in lst) / len(lst)
        doc = _users.get(doctor_id)
        if doc:
            doc['rating'] = round(avg * 10) / 10
            doc['reviewCount'] = len(lst)
            _users[doctor_id] = doc
        return entry

    def get_for_doctor(self, doctor_id):
        lst = _ratings.get(doctor_id, [])
        result = []
        for r in lst:
            u = _users.get(r['userId'])
            result.append({
                **r,
                'user': {'name': u['name'], 'avatar': u.get('avatar')} if u else {'name': 'Anonymous'}
            })
        return result


# ── Slots ─────────────────────────────────────────────────────────────────────
class _Slots:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'doctorId': data['doctorId'],
            'day': data['day'],
            'startTime': data['startTime'],
            'endTime': data['endTime'],
            'fee': data.get('fee', 0),
            'duration': data.get('duration', 30),
            'isBooked': False,
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _slots[id_] = doc
        return _clone(doc)

    def find_by_id(self, id_):
        return _clone(_slots.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_slots, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _slots.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _slots[id_] = doc
        return _clone(doc)

    def delete_one(self, id_):
        _slots.pop(id_, None)


# ── Consultations ─────────────────────────────────────────────────────────────
class _Consultations:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'patientId': data['patientId'],
            'doctorId': data['doctorId'],
            'slotId': data['slotId'],
            'slotDay': data.get('slotDay', ''),
            'slotTime': data.get('slotTime', ''),
            'fee': data.get('fee', 0),
            'symptoms': data.get('symptoms', ''),
            'status': 'pending_payment',
            'paymentId': None,
            'doctorMessage': '',
            'meetLink': '',
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _consultations[id_] = doc
        return _clone(doc)

    def find_by_id(self, id_):
        return _clone(_consultations.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_consultations, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _consultations.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _consultations[id_] = doc
        return _clone(doc)


# ── Chat Requests ─────────────────────────────────────────────────────────────
class _ChatRequests:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'patientId': data['patientId'],
            'doctorId': data['doctorId'],
            'concern': data.get('concern', ''),
            'preferredDay': data.get('preferredDay', ''),
            'preferredTime': data.get('preferredTime', ''),
            'status': 'pending',
            'proposedDay': '',
            'proposedTime': '',
            'fee': 0,
            'duration': 30,
            'doctorNote': '',
            'paymentId': None,
            'closedAt': None,
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _chat_requests[id_] = doc
        return _clone(doc)

    def find_by_id(self, id_):
        return _clone(_chat_requests.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_chat_requests, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _chat_requests.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _chat_requests[id_] = doc
        return _clone(doc)


# ── Chat Messages ─────────────────────────────────────────────────────────────
class _ChatMessages:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'chatId': data['chatId'],
            'senderId': data['senderId'],
            'senderName': data['senderName'],
            'senderRole': data['senderRole'],
            'text': data['text'],
            'createdAt': _now(),
        }
        _chat_messages[id_] = doc
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_chat_messages, filter_)


# ── FAQs ──────────────────────────────────────────────────────────────────────
class _Faqs:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'question': data['question'],
            'answer': data['answer'],
            'category': data.get('category', 'General'),
            'order': data.get('order', 0),
            'createdAt': _now(),
        }
        _faqs[id_] = doc
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        results = _apply_filter(_faqs, filter_)
        return sorted(results, key=lambda x: x.get('order', 0))


# ── Support Tickets ───────────────────────────────────────────────────────────
class _SupportTickets:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'userId': data['userId'],
            'subject': data['subject'],
            'message': data['message'],
            'status': 'pending',
            'response': '',
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _support_tickets[id_] = doc
        return _clone(doc)

    def find_by_id(self, id_):
        return _clone(_support_tickets.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_support_tickets, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _support_tickets.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _support_tickets[id_] = doc
        return _clone(doc)


# ── Lounge Posts ──────────────────────────────────────────────────────────────
class _LoungePosts:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'title': data['title'],
            'description': data.get('description', ''),
            'category': data.get('category', 'General'),
            'authorId': data['authorId'],
            'authorRole': data.get('authorRole', 'doctor'),
            'status': 'open',
            'upvotes': [],
            'views': 0,
            'repliesCount': 0,
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _lounge_posts[id_] = doc
        return _clone(doc)

    def find_by_id(self, id_):
        return _clone(_lounge_posts.get(id_))

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_lounge_posts, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _lounge_posts.get(id_)
        if not doc:
            return None
        if '$inc' in update:
            for k, v in update['$inc'].items():
                doc[k] = (doc.get(k) or 0) + v
            update = {k: v for k, v in update.items() if k != '$inc'}
        doc.update(update)
        doc['updatedAt'] = _now()
        _lounge_posts[id_] = doc
        return _clone(doc)

    def delete_one(self, id_):
        _lounge_posts.pop(id_, None)


# ── Lounge Replies ────────────────────────────────────────────────────────────
class _LoungeReplies:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'postId': data['postId'],
            'authorId': data['authorId'],
            'text': data['text'],
            'upvotes': [],
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _lounge_replies[id_] = doc
        post = _lounge_posts.get(data['postId'])
        if post:
            post['repliesCount'] = (post.get('repliesCount') or 0) + 1
            _lounge_posts[data['postId']] = post
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_lounge_replies, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _lounge_replies.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _lounge_replies[id_] = doc
        return _clone(doc)

    def delete_one(self, id_):
        _lounge_replies.pop(id_, None)


# ── Notifications ─────────────────────────────────────────────────────────────
class _Notifications:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'userId': data['userId'],
            'text': data['text'],
            'link': data.get('link', ''),
            'read': False,
            'createdAt': _now(),
        }
        _notifications[id_] = doc
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_notifications, filter_)

    def find_by_id_and_update(self, id_, update):
        doc = _notifications.get(id_)
        if not doc:
            return None
        doc.update(update)
        _notifications[id_] = doc
        return _clone(doc)

    def mark_all_read(self, user_id):
        for doc in _notifications.values():
            if doc['userId'] == user_id and not doc['read']:
                doc['read'] = True


# ── Blood Donors ──────────────────────────────────────────────────────────────
class _BloodDonors:
    def create(self, data):
        existing = next((d for d in _blood_donors.values() if d['userId'] == data['userId']), None)
        if existing:
            existing.update({**data, 'updatedAt': _now()})
            _blood_donors[existing['_id']] = existing
            return _clone(existing)
        id_ = _uuid()
        doc = {
            '_id': id_,
            'userId': data['userId'],
            'name': data['name'],
            'bloodGroup': data['bloodGroup'],
            'city': (data.get('city') or '').strip().lower(),
            'phone': data.get('phone', ''),
            'available': data.get('available', True),
            'lastDonated': data.get('lastDonated', None),
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _blood_donors[id_] = doc
        return _clone(doc)

    def find_by_user_id(self, user_id):
        doc = next((d for d in _blood_donors.values() if d['userId'] == user_id), None)
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_blood_donors, filter_)

    def find_by_id(self, id_):
        return _clone(_blood_donors.get(id_))

    def find_by_id_and_update(self, id_, update):
        doc = _blood_donors.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _blood_donors[id_] = doc
        return _clone(doc)


# ── Blood Requests ────────────────────────────────────────────────────────────
class _BloodRequests:
    def create(self, data):
        id_ = _uuid()
        doc = {
            '_id': id_,
            'recipientId': data['recipientId'],
            'recipientName': data.get('recipientName', ''),
            'donorId': data['donorId'],
            'donorName': data.get('donorName', ''),
            'bloodGroup': data.get('bloodGroup', ''),
            'message': data.get('message', ''),
            'status': 'pending',
            'messages': [],
            'createdAt': _now(),
            'updatedAt': _now(),
        }
        _blood_requests[id_] = doc
        return _clone(doc)

    def find(self, filter_=None):
        if filter_ is None:
            filter_ = {}
        return _apply_filter(_blood_requests, filter_)

    def find_by_id(self, id_):
        return _clone(_blood_requests.get(id_))

    def find_by_id_and_update(self, id_, update):
        doc = _blood_requests.get(id_)
        if not doc:
            return None
        doc.update(update)
        doc['updatedAt'] = _now()
        _blood_requests[id_] = doc
        return _clone(doc)

    def add_message(self, id_, msg):
        doc = _blood_requests.get(id_)
        if not doc:
            return None
        message = {'_id': _uuid(), **msg, 'createdAt': _now()}
        doc['messages'].append(message)
        doc['updatedAt'] = _now()
        _blood_requests[id_] = doc
        return _clone(doc)


# ── Singleton instances ───────────────────────────────────────────────────────
Users = _Users()
Questions = _Questions()
Answers = _Answers()
Ratings = _Ratings()
Slots = _Slots()
Consultations = _Consultations()
ChatRequests = _ChatRequests()
ChatMessages = _ChatMessages()
Faqs = _Faqs()
SupportTickets = _SupportTickets()
LoungePosts = _LoungePosts()
LoungeReplies = _LoungeReplies()
Notifications = _Notifications()
BloodDonors = _BloodDonors()
BloodRequests = _BloodRequests()


# ── Seed Data ─────────────────────────────────────────────────────────────────
def _seed():
    import bcrypt as _bcrypt

    admin_pw = _bcrypt.hashpw(b'Admin@123', _bcrypt.gensalt()).decode()
    Users.create({'name': 'Admin', 'email': 'admin@swasthsamaj.in',
                  'password': admin_pw, 'role': 'admin', 'verified': True})

    doctors = [
        {'name': 'Dr. Priya Ramesh',  'specialty': 'Cardiologist',   'institution': 'AIIMS Delhi',        'experience': '12 years', 'rating': 4.8, 'reviewCount': 124, 'patientCount': 320, 'responseTime': '< 30 min', 'bio': 'Senior Cardiologist with expertise in interventional cardiology and heart failure management.'},
        {'name': 'Dr. Arjun Mehta',   'specialty': 'Dermatologist',  'institution': 'Fortis Mumbai',      'experience': '8 years',  'rating': 4.6, 'reviewCount': 87,  'patientCount': 210, 'responseTime': '< 1 hr',   'bio': 'Specialist in skin disorders, cosmetic procedures and laser treatments.'},
        {'name': 'Dr. Sunita Gupta',  'specialty': 'Pediatrician',   'institution': 'Apollo Hyderabad',   'experience': '15 years', 'rating': 4.9, 'reviewCount': 203, 'patientCount': 540, 'responseTime': '< 20 min', 'bio': 'Award-winning pediatrician with special focus on neonatal care and childhood nutrition.'},
        {'name': 'Dr. Rakesh Sharma', 'specialty': 'Orthopedician',  'institution': 'Max Delhi',          'experience': '10 years', 'rating': 4.5, 'reviewCount': 65,  'patientCount': 180, 'responseTime': '< 2 hrs',  'bio': 'Joint replacement specialist with advanced training from Germany.'},
        {'name': 'Dr. Kavitha Nair',  'specialty': 'Neurologist',    'institution': 'Manipal Bangalore',  'experience': '11 years', 'rating': 4.7, 'reviewCount': 91,  'patientCount': 270, 'responseTime': '< 1 hr',   'bio': 'Expert in stroke management, epilepsy and neurodegenerative disorders.'},
        {'name': 'Dr. Rohan Joshi',   'specialty': 'Psychiatrist',   'institution': 'Nimhans Bangalore',  'experience': '9 years',  'rating': 4.4, 'reviewCount': 54,  'patientCount': 145, 'responseTime': '< 3 hrs',  'bio': 'Specialist in depression, anxiety, PTSD and addiction medicine.'},
    ]
    import random
    for d in doctors:
        pw = _bcrypt.hashpw(b'Doctor@123', _bcrypt.gensalt()).decode()
        email = d['name'].lower().replace(' ', '.') + '@swasthsamaj.in'
        Users.create({
            'name': d['name'], 'email': email,
            'password': pw, 'role': 'doctor', 'verified': True,
            'specialty': d['specialty'], 'institution': d['institution'],
            'experience': d['experience'], 'bio': d['bio'],
            'rating': d['rating'], 'reviewCount': d['reviewCount'],
            'patientCount': d['patientCount'], 'responseTime': d['responseTime'],
            'online': random.random() > 0.5,
        })

    faq_data = [
        {'question': 'How do I book a private consultation?', 'answer': 'Navigate to the Forum and select "Private Chat". Pick a doctor and click "Request Chat". Once the doctor proposes a slot, you can pay to confirm.', 'category': 'Consultations', 'order': 1},
        {'question': 'Are the doctors on Swasth Samaj verified?', 'answer': 'Yes! All doctors must provide their MBBS or Government Registration Number and are manually verified by our admin team before they can accept consultations or answer public questions.', 'category': 'General', 'order': 2},
        {'question': 'What happens if a doctor rejects my chat request?', 'answer': 'If a doctor is busy or unavailable, they may reject your request. You will not be charged, and you can submit a new request to another doctor.', 'category': 'Consultations', 'order': 3},
        {'question': 'Who can see my community Q&A posts?', 'answer': 'Community questions are public, but you can choose to remain anonymous if you prefer. Only verified medical professionals can reply to ensure accurate information.', 'category': 'Community', 'order': 4},
    ]
    for f in faq_data:
        Faqs.create(f)

    print('🌱 Seeded: 1 admin + 6 verified doctors')
    print('   Admin login: admin@swasthsamaj.in / Admin@123')


_seed()

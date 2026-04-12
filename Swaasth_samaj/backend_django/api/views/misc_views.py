"""
Remaining smaller views: notifications, faqs, support, articles, hospitals, lounge
"""
import json
import uuid as _uuid
from datetime import datetime, timezone
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import (Notifications, Faqs, SupportTickets,
                          LoungePosts, LoungeReplies, Users)
from middleware.auth import protect, require_role, require_verified

# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

@protect
@require_http_methods(['GET'])
def list_notifications(request):
    try:
        lst = Notifications.find({'userId': request.user['_id']})
        lst.sort(key=lambda n: n.get('createdAt', ''), reverse=True)
        return JsonResponse(lst, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def read_all_notifications(request):
    try:
        Notifications.mark_all_read(request.user['_id'])
        return JsonResponse({'message': 'All notifications marked as read'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def read_notification(request, id):
    try:
        notif = Notifications.find_by_id_and_update(id, {'read': True})
        if not notif:
            return JsonResponse({'message': 'Not found'}, status=404)
        if notif.get('userId') != request.user['_id']:
            return JsonResponse({'message': 'Access denied'}, status=403)
        return JsonResponse(notif)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# FAQs
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def list_faqs(request):
    return JsonResponse(Faqs.find(), safe=False)


@csrf_exempt
@protect
@require_role('admin')
@require_http_methods(['POST'])
def create_faq(request):
    try:
        body = json.loads(request.body or '{}')
        doc = Faqs.create(body)
        return JsonResponse(doc, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# SUPPORT
# ─────────────────────────────────────────────────────────────────────────────

@protect
@require_http_methods(['GET'])
def my_support(request):
    tickets = SupportTickets.find({'userId': request.user['_id']})
    tickets.sort(key=lambda t: t.get('createdAt', ''), reverse=True)
    return JsonResponse(tickets, safe=False)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def create_support(request):
    try:
        body = json.loads(request.body or '{}')
        subject = body.get('subject')
        message = body.get('message')
        if not subject or not message:
            return JsonResponse({'message': 'Subject and message are required'}, status=400)
        doc = SupportTickets.create({'userId': request.user['_id'], 'subject': subject, 'message': message})
        return JsonResponse(doc, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# ARTICLES (in-memory, not in main store — own dict here)
# ─────────────────────────────────────────────────────────────────────────────

_articles = {}

def _seed_articles():
    samples = [
        {'title': 'Heart Health in the Modern Age', 'content': 'Regular exercise, a balanced diet, and routine checkups are key pillars of heart health...', 'category': 'Cardiology', 'tags': ['heart', 'exercise', 'diet']},
        {'title': 'Mental Wellness Tips for Everyday Life', 'content': 'Simple practices like mindfulness, adequate sleep, and social connection can drastically improve mental health...', 'category': 'Mental Health', 'tags': ['mindfulness', 'wellness', 'stress']},
        {'title': 'Understanding Childhood Nutrition', 'content': 'Children require a balanced intake of macronutrients and micronutrients for proper growth and development...', 'category': 'Pediatrics', 'tags': ['nutrition', 'children', 'diet']},
    ]
    for a in samples:
        id_ = str(_uuid.uuid4())
        _articles[id_] = {**a, '_id': id_, 'authorId': 'system', 'authorName': 'Swasth Samaj Team',
                          'status': 'published', 'createdAt': datetime.now(timezone.utc).isoformat()}

_seed_articles()


@require_http_methods(['GET'])
def list_articles(request):
    try:
        category = request.GET.get('category')
        result = [a for a in _articles.values() if a.get('status') == 'published']
        if category:
            result = [a for a in result if a.get('category') == category]
        result.sort(key=lambda a: a.get('createdAt', ''), reverse=True)
        enriched = []
        for a in result:
            author = Users.find_by_id(a.get('authorId'))
            enriched.append({**a, 'author': {'name': author['name'], 'specialty': author.get('specialty'), 'verified': author.get('verified')} if author else {'name': a.get('authorName', 'Swasth Team')}})
        return JsonResponse(enriched, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('doctor', 'student', 'admin')
@require_verified
@require_http_methods(['POST'])
def create_article(request):
    try:
        body = json.loads(request.body or '{}')
        title = body.get('title')
        content = body.get('content')
        if not title or not content:
            return JsonResponse({'message': 'Title and content required'}, status=400)
        id_ = str(_uuid.uuid4())
        article = {
            '_id': id_, 'title': title, 'content': content,
            'category': body.get('category', 'General'), 'tags': body.get('tags', []),
            'authorId': request.user['_id'],
            'status': 'published' if request.user.get('role') == 'admin' else 'pending',
            'createdAt': datetime.now(timezone.utc).isoformat(),
        }
        _articles[id_] = article
        return JsonResponse(article, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('admin')
@require_http_methods(['PUT'])
def approve_article(request, id):
    try:
        body = json.loads(request.body or '{}')
        article = _articles.get(id)
        if not article:
            return JsonResponse({'message': 'Article not found'}, status=404)
        article['status'] = body.get('status', article['status'])
        _articles[id] = article
        return JsonResponse(article)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# HOSPITALS
# ─────────────────────────────────────────────────────────────────────────────

import math as _math

HOSPITALS = [
    {'id': 1,  'name': 'AIIMS Delhi',               'type': 'Government Hospital', 'specialty': 'Multi-specialty',           'address': 'Ansari Nagar, New Delhi',          'lat': 28.5672, 'lng': 77.2100, 'phone': '011-26588500', 'emergency': True,  'bloodBank': True,  'rating': 4.8},
    {'id': 2,  'name': 'Fortis Hospital Vasant Kunj','type': 'Private Hospital',    'specialty': 'Cardiology & Oncology',     'address': 'Vasant Kunj, New Delhi',           'lat': 28.5245, 'lng': 77.1586, 'phone': '011-42776222', 'emergency': True,  'bloodBank': True,  'rating': 4.5},
    {'id': 3,  'name': 'Apollo Hospital',            'type': 'Private Hospital',    'specialty': 'Multi-specialty',           'address': 'Sarita Vihar, New Delhi',          'lat': 28.5424, 'lng': 77.2874, 'phone': '011-71791090', 'emergency': True,  'bloodBank': True,  'rating': 4.7},
    {'id': 4,  'name': 'Max Super Speciality',       'type': 'Private Hospital',    'specialty': 'Neurology & Orthopedics',   'address': 'Saket, New Delhi',                 'lat': 28.5265, 'lng': 77.2162, 'phone': '011-26515050', 'emergency': True,  'bloodBank': False, 'rating': 4.4},
    {'id': 5,  'name': 'Safdarjung Hospital',        'type': 'Government Hospital', 'specialty': 'Trauma & Emergency',        'address': 'Safdarjung, New Delhi',            'lat': 28.5695, 'lng': 77.2060, 'phone': '011-26730000', 'emergency': True,  'bloodBank': True,  'rating': 4.2},
    {'id': 6,  'name': 'City Clinic & Diagnostics',  'type': 'Clinic',              'specialty': 'General Medicine',          'address': 'Lajpat Nagar, New Delhi',          'lat': 28.5677, 'lng': 77.2358, 'phone': '011-29834410', 'emergency': False, 'bloodBank': False, 'rating': 4.0},
    {'id': 7,  'name': 'RML Hospital',               'type': 'Government Hospital', 'specialty': 'Multi-specialty',           'address': 'Baba Kharak Singh Marg',           'lat': 28.6265, 'lng': 77.2018, 'phone': '011-23365525', 'emergency': True,  'bloodBank': True,  'rating': 4.1},
    {'id': 8,  'name': 'Medanta The Medicity',       'type': 'Private Hospital',    'specialty': 'Cardiac Sciences',          'address': 'Sector 38, Gurugram',              'lat': 28.4412, 'lng': 77.0308, 'phone': '0124-4141414', 'emergency': True,  'bloodBank': True,  'rating': 4.9},
    {'id': 9,  'name': 'Holy Family Hospital',       'type': 'Private Hospital',    'specialty': 'Obstetrics & Gynecology',   'address': 'Okhla, New Delhi',                 'lat': 28.5490, 'lng': 77.2710, 'phone': '011-26845100', 'emergency': True,  'bloodBank': False, 'rating': 4.3},
    {'id': 10, 'name': 'Primus Super Speciality',    'type': 'Private Hospital',    'specialty': 'Orthopedics & Spine',       'address': 'Chandragupta Marg, Chanakyapuri', 'lat': 28.5936, 'lng': 77.1840, 'phone': '011-66206620', 'emergency': False, 'bloodBank': False, 'rating': 4.6},
]

STATIC_BLOOD_DONORS = [
    {'id': 1, 'name': 'Rahul Singh',  'bloodGroup': 'A+', 'location': 'Lajpat Nagar', 'lastDonated': '3 months ago', 'available': True,  'phone': '+91-98100-12345'},
    {'id': 2, 'name': 'Priya Sharma', 'bloodGroup': 'O-', 'location': 'Vasant Kunj',  'lastDonated': '6 weeks ago',  'available': True,  'phone': '+91-99110-54321'},
    {'id': 3, 'name': 'Amit Kumar',   'bloodGroup': 'B+', 'location': 'Saket',         'lastDonated': '2 months ago', 'available': True,  'phone': '+91-88001-67890'},
    {'id': 4, 'name': 'Sunita Devi',  'bloodGroup': 'AB+','location': 'Dwarka',        'lastDonated': '4 months ago', 'available': True,  'phone': '+91-77770-98765'},
    {'id': 5, 'name': 'Ravi Patel',   'bloodGroup': 'O+', 'location': 'Rohini',        'lastDonated': '5 weeks ago',  'available': False, 'phone': '+91-96320-11223'},
    {'id': 6, 'name': 'Kavita Nair',  'bloodGroup': 'A-', 'location': 'Mayur Vihar',  'lastDonated': '8 weeks ago',  'available': True,  'phone': '+91-91234-56789'},
]


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    d_lat = (lat2 - lat1) * _math.pi / 180
    d_lon = (lon2 - lon1) * _math.pi / 180
    a = (_math.sin(d_lat/2)**2 + _math.cos(lat1*_math.pi/180) *
         _math.cos(lat2*_math.pi/180) * _math.sin(d_lon/2)**2)
    return round(R * 2 * _math.atan2(_math.sqrt(a), _math.sqrt(1-a)), 1)


@require_http_methods(['GET'])
def list_hospitals(request):
    import random
    type_ = request.GET.get('type', '')
    emergency = request.GET.get('emergency', '')
    blood_bank = request.GET.get('bloodBank', '')
    user_lat = request.GET.get('userLat')
    user_lng = request.GET.get('userLng')

    result = []
    for h in HOSPITALS:
        if user_lat and user_lng:
            dist = str(_haversine(float(user_lat), float(user_lng), h['lat'], h['lng']))
        else:
            dist = str(round(random.uniform(1, 11), 1))
        result.append({**h, 'distance': dist})

    if type_:
        result = [h for h in result if type_.lower() in h['type'].lower()]
    if emergency == 'true':
        result = [h for h in result if h['emergency']]
    if blood_bank == 'true':
        result = [h for h in result if h['bloodBank']]

    result.sort(key=lambda h: float(h['distance']))
    return JsonResponse(result, safe=False)


@require_http_methods(['GET'])
def hospital_blood_donors(request):
    blood_group = request.GET.get('bloodGroup', '')
    result = list(STATIC_BLOOD_DONORS)
    if blood_group:
        result = [d for d in result if d['bloodGroup'] == blood_group]
    return JsonResponse(result, safe=False)


# ─────────────────────────────────────────────────────────────────────────────
# LOUNGE
# ─────────────────────────────────────────────────────────────────────────────

def _populate_author(doc):
    if not doc:
        return None
    author = Users.find_by_id(doc.get('authorId'))
    return {
        **doc,
        'author': {'_id': author['_id'], 'name': author['name'], 'role': author['role'],
                   'specialty': author.get('specialty'), 'verified': author.get('verified')} if author else None
    }


def _seed_lounge():
    if not LoungePosts.find():
        docs = Users.find({'role': 'doctor'})
        if docs:
            LoungePosts.create({
                'title': 'New approach to treating persistent migraines?',
                'description': "Has anyone had success with CGRP inhibitors for patients who don't respond well to traditional triptans? I am seeing mixed results in my clinic and would love to hear practical experiences from other neurologists here.",
                'category': 'Neurology',
                'authorId': docs[0]['_id'],
                'authorRole': 'doctor',
            })

_seed_lounge()


@require_http_methods(['GET'])
def list_lounge(request):
    category = request.GET.get('category')
    author_role = request.GET.get('authorRole')
    filters = {}
    if category and category != 'All':
        filters['category'] = category
    if author_role:
        filters['authorRole'] = author_role
    posts = LoungePosts.find(filters)
    populated = sorted([_populate_author(p) for p in posts], key=lambda p: p.get('createdAt', ''), reverse=True)
    return JsonResponse({'posts': populated})


@csrf_exempt
@protect
@require_role(['doctor', 'student'])
@require_http_methods(['POST'])
def create_lounge_post(request):
    body = json.loads(request.body or '{}')
    title = body.get('title')
    if not title:
        return JsonResponse({'message': 'Title is required'}, status=400)
    post = LoungePosts.create({
        'title': title,
        'description': body.get('description', ''),
        'category': body.get('category', 'General'),
        'authorId': request.user['_id'],
        'authorRole': request.user['role'],
    })
    return JsonResponse(_populate_author(post), status=201)


@require_http_methods(['GET'])
def get_lounge_post(request, id):
    post = LoungePosts.find_by_id(id)
    if not post:
        return JsonResponse({'message': 'Post not found'}, status=404)
    replies = sorted([_populate_author(r) for r in LoungeReplies.find({'postId': id})],
                     key=lambda r: r.get('createdAt', ''))
    return JsonResponse({'post': _populate_author(post), 'replies': replies})


@csrf_exempt
@protect
@require_http_methods(['POST'])
def reply_lounge(request, id):
    body = json.loads(request.body or '{}')
    text = body.get('text')
    if not text:
        return JsonResponse({'message': 'Text is required'}, status=400)
    post = LoungePosts.find_by_id(id)
    if not post:
        return JsonResponse({'message': 'Post not found'}, status=404)
    reply = LoungeReplies.create({'postId': post['_id'], 'authorId': request.user['_id'], 'text': text})
    return JsonResponse(_populate_author(reply), status=201)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def upvote_lounge(request, id):
    post = LoungePosts.find_by_id(id)
    if not post:
        return JsonResponse({'message': 'Post not found'}, status=404)
    upvotes = list(post.get('upvotes') or [])
    uid = request.user['_id']
    if uid not in upvotes:
        upvotes.append(uid)
    else:
        upvotes = [u for u in upvotes if u != uid]
    updated = LoungePosts.find_by_id_and_update(post['_id'], {'upvotes': upvotes})
    return JsonResponse(_populate_author(updated))


@protect
@require_http_methods(['GET'])
def my_lounge(request):
    try:
        posts = LoungePosts.find({'authorId': request.user['_id']})
        populated = sorted([_populate_author(p) for p in posts], key=lambda p: p.get('createdAt', ''), reverse=True)
        return JsonResponse({'posts': populated})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

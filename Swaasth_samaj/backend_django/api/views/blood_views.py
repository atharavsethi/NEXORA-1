"""
Blood views — port of routes/blood.js
GET    /api/blood/hospitals
GET    /api/blood/donors
GET    /api/blood/my-donor-profile
POST   /api/blood/donors
PATCH  /api/blood/donors/toggle
POST   /api/blood/request/<donorId>
GET    /api/blood/requests
PATCH  /api/blood/request/<id>/accept
PATCH  /api/blood/request/<id>/decline
GET    /api/blood/chat/<requestId>
POST   /api/blood/chat/<requestId>
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import BloodDonors, BloodRequests, Users, Notifications
from middleware.auth import protect

BLOOD_HOSPITALS = [
    {'_id': 'h1',  'name': 'AIIMS Blood Bank',          'city': 'delhi',      'address': 'Ansari Nagar, New Delhi – 110029',      'phone': '011-26588500', 'type': 'Government', 'available': ['A+','A-','B+','O+','O-','AB+'],            'timings': '24x7'},
    {'_id': 'h2',  'name': 'Apollo Blood Bank',          'city': 'delhi',      'address': 'Sarita Vihar, New Delhi – 110076',      'phone': '011-29871000', 'type': 'Private',    'available': ['A+','B+','AB+','O+'],                     'timings': '8am – 8pm'},
    {'_id': 'h3',  'name': 'Fortis Blood Bank',          'city': 'mumbai',     'address': 'Mulund West, Mumbai – 400080',          'phone': '022-67114000', 'type': 'Private',    'available': ['B+','B-','O+','O-','AB-'],                'timings': '9am – 9pm'},
    {'_id': 'h4',  'name': 'KEM Hospital Blood Bank',    'city': 'mumbai',     'address': 'Parel, Mumbai – 400012',               'phone': '022-24107000', 'type': 'Government', 'available': ['A+','A-','B+','B-','O+','O-','AB+','AB-'],'timings': '24x7'},
    {'_id': 'h5',  'name': 'Apollo Blood Bank',          'city': 'hyderabad',  'address': 'Jubilee Hills, Hyderabad – 500033',    'phone': '040-23607777', 'type': 'Private',    'available': ['A+','O+','B+','AB+'],                     'timings': '8am – 8pm'},
    {'_id': 'h6',  'name': 'Osmania General Blood Bank', 'city': 'hyderabad',  'address': 'Afzalgunj, Hyderabad – 500012',        'phone': '040-24600124', 'type': 'Government', 'available': ['A+','A-','O+','O-','B+','B-'],            'timings': '24x7'},
    {'_id': 'h7',  'name': 'Manipal Hospital Blood Bank','city': 'bangalore',  'address': 'Old Airport Road, Bangalore – 560017', 'phone': '080-25024444', 'type': 'Private',    'available': ['A+','AB+','O+','B+'],                     'timings': '9am – 6pm'},
    {'_id': 'h8',  'name': 'Victoria Hospital Blood Bank','city': 'bangalore', 'address': 'K R Market, Bangalore – 560002',       'phone': '080-26704444', 'type': 'Government', 'available': ['A+','A-','B+','B-','O+','O-','AB+','AB-'],'timings': '24x7'},
    {'_id': 'h9',  'name': 'PGIMER Blood Bank',          'city': 'chandigarh', 'address': 'Sector 12, Chandigarh – 160012',       'phone': '0172-2747585', 'type': 'Government', 'available': ['A+','A-','B+','O+','O-'],                 'timings': '24x7'},
    {'_id': 'h10', 'name': 'Max Hospital Blood Bank',    'city': 'pune',       'address': 'Baner, Pune – 411045',                 'phone': '020-66462800', 'type': 'Private',    'available': ['A+','B+','O+','AB+'],                     'timings': '8am – 8pm'},
]


@require_http_methods(['GET'])
def blood_hospitals(request):
    try:
        city = request.GET.get('city', '').strip().lower()
        blood_group = request.GET.get('bloodGroup', '')
        lst = list(BLOOD_HOSPITALS)
        if city:
            lst = [h for h in lst if city in h['city']]
        if blood_group:
            lst = [h for h in lst if blood_group in h['available']]
        return JsonResponse(lst, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(['GET'])
def blood_donors(request):
    try:
        city = request.GET.get('city', '').strip().lower()
        blood_group = request.GET.get('bloodGroup', '')
        lst = BloodDonors.find({'available': True})
        if city:
            lst = [d for d in lst if city in (d.get('city') or '')]
        if blood_group:
            lst = [d for d in lst if d.get('bloodGroup') == blood_group]
        enriched = []
        for d in lst:
            u = Users.find_by_id(d.get('userId'))
            enriched.append({'_id': d['_id'], 'userId': d['userId'], 'name': d['name'],
                             'bloodGroup': d['bloodGroup'], 'city': d['city'], 'phone': d.get('phone'),
                             'available': d['available'], 'lastDonated': d.get('lastDonated'),
                             'avatar': u.get('avatar') if u else None})
        return JsonResponse(enriched, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def my_donor_profile(request):
    try:
        profile = BloodDonors.find_by_user_id(request.user['_id'])
        return JsonResponse(profile) if profile else JsonResponse(None, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def register_donor(request):
    try:
        body = json.loads(request.body or '{}')
        blood_group = body.get('bloodGroup')
        city = body.get('city', '').strip()
        if not blood_group or not city:
            return JsonResponse({'message': 'Blood group and city are required.'}, status=400)
        profile = BloodDonors.create({
            'userId': request.user['_id'],
            'name': request.user['name'],
            'bloodGroup': blood_group,
            'city': city.lower(),
            'phone': body.get('phone', ''),
            'available': body.get('available', True),
            'lastDonated': body.get('lastDonated'),
        })
        return JsonResponse(profile, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def toggle_donor(request):
    try:
        profile = BloodDonors.find_by_user_id(request.user['_id'])
        if not profile:
            return JsonResponse({'message': 'Donor profile not found.'}, status=404)
        updated = BloodDonors.find_by_id_and_update(profile['_id'], {'available': not profile['available']})
        return JsonResponse(updated)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def blood_request(request, donor_id):
    try:
        donor = BloodDonors.find_by_id(donor_id)
        if not donor:
            return JsonResponse({'message': 'Donor not found.'}, status=404)
        if donor.get('userId') == request.user['_id']:
            return JsonResponse({'message': 'You cannot request from yourself.'}, status=400)
        if not donor.get('available'):
            return JsonResponse({'message': 'This donor is currently unavailable.'}, status=400)

        body = json.loads(request.body or '{}')
        blood_req = BloodRequests.create({
            'recipientId': request.user['_id'],
            'recipientName': request.user['name'],
            'donorId': donor['userId'],
            'donorName': donor['name'],
            'bloodGroup': body.get('bloodGroup') or donor['bloodGroup'],
            'message': body.get('message', ''),
        })
        Notifications.create({
            'userId': donor['userId'],
            'text': f"🩸 {request.user['name']} needs your help! Blood group {donor['bloodGroup']} — see Blood SOS requests.",
            'link': '/blood-sos',
        })
        return JsonResponse(blood_req, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def blood_requests(request):
    try:
        inbound = BloodRequests.find({'donorId': request.user['_id']})
        outbound = BloodRequests.find({'recipientId': request.user['_id']})

        def enrich(r):
            donor_profile = BloodDonors.find_by_user_id(r.get('donorId'))
            recip_profile = BloodDonors.find_by_user_id(r.get('recipientId'))
            return {
                **r,
                'recipientName': recip_profile['name'] if recip_profile else r.get('recipientName', 'User'),
                'donorName': donor_profile['name'] if donor_profile else r.get('donorName', 'Donor'),
                'donorPhone': donor_profile['phone'] if donor_profile else '',
            }

        return JsonResponse({
            'inbound':  sorted([enrich(r) for r in inbound],  key=lambda x: x.get('createdAt', ''), reverse=True),
            'outbound': sorted([enrich(r) for r in outbound], key=lambda x: x.get('createdAt', ''), reverse=True),
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def accept_blood_request(request, id):
    try:
        r = BloodRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Request not found.'}, status=404)
        if r.get('donorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request.'}, status=403)
        if r.get('status') != 'pending':
            return JsonResponse({'message': 'Request already actioned.'}, status=400)
        updated = BloodRequests.find_by_id_and_update(id, {'status': 'accepted'})
        Notifications.create({
            'userId': r['recipientId'],
            'text': '✅ Your blood request was accepted! You can now chat with the donor in Blood SOS.',
            'link': '/blood-sos',
        })
        return JsonResponse(updated)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def decline_blood_request(request, id):
    try:
        r = BloodRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Request not found.'}, status=404)
        if r.get('donorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request.'}, status=403)
        updated = BloodRequests.find_by_id_and_update(id, {'status': 'declined'})
        Notifications.create({
            'userId': r['recipientId'],
            'text': '❌ Your blood request was declined. Please try another donor in Blood SOS.',
            'link': '/blood-sos',
        })
        return JsonResponse(updated)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def blood_chat_get(request, request_id):
    try:
        r = BloodRequests.find_by_id(request_id)
        if not r:
            return JsonResponse({'message': 'Chat not found.'}, status=404)
        if r.get('recipientId') != request.user['_id'] and r.get('donorId') != request.user['_id']:
            return JsonResponse({'message': 'Access denied.'}, status=403)
        if r.get('status') != 'accepted':
            return JsonResponse({'message': 'Chat only available after acceptance.'}, status=400)
        return JsonResponse(r)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def blood_chat_send(request, request_id):
    try:
        r = BloodRequests.find_by_id(request_id)
        if not r:
            return JsonResponse({'message': 'Chat not found.'}, status=404)
        if r.get('recipientId') != request.user['_id'] and r.get('donorId') != request.user['_id']:
            return JsonResponse({'message': 'Access denied.'}, status=403)
        if r.get('status') != 'accepted':
            return JsonResponse({'message': 'Chat only available after acceptance.'}, status=400)

        body = json.loads(request.body or '{}')
        text = (body.get('text') or '').strip()
        if not text:
            return JsonResponse({'message': 'Message text required.'}, status=400)

        updated = BloodRequests.add_message(request_id, {
            'senderId': request.user['_id'],
            'senderName': request.user['name'],
            'text': text,
        })
        return JsonResponse(updated)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

"""
Doctors views — port of routes/doctors.js
GET  /api/doctors/
GET  /api/doctors/<id>
GET  /api/doctors/<id>/ratings
POST /api/doctors/<id>/rate
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Users, Ratings
from middleware.auth import protect


@require_http_methods(['GET'])
def list_doctors(request):
    try:
        specialty = request.GET.get('specialty')
        min_rating = request.GET.get('minRating')
        search = request.GET.get('search')

        doctors = Users.find({'role': 'doctor', 'verified': True})
        if specialty:
            doctors = [d for d in doctors if specialty.lower() in (d.get('specialty') or '').lower()]
        if min_rating:
            doctors = [d for d in doctors if (d.get('rating') or 0) >= float(min_rating)]
        if search:
            import re
            rx = re.compile(search, re.IGNORECASE)
            doctors = [d for d in doctors if rx.search(d.get('name', '')) or rx.search(d.get('specialty', '')) or rx.search(d.get('institution', ''))]

        doctors.sort(key=lambda d: (d.get('rating') or 0), reverse=True)
        sanitized = [{k: v for k, v in d.items() if k != 'password'} for d in doctors]
        return JsonResponse(sanitized, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(['GET'])
def get_doctor(request, id):
    try:
        doc = Users.find_by_id(id)
        if not doc or doc.get('role') != 'doctor':
            return JsonResponse({'message': 'Doctor not found'}, status=404)
        out = {k: v for k, v in doc.items() if k != 'password'}
        reviews = Ratings.get_for_doctor(id)
        return JsonResponse({**out, 'reviews': reviews})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(['GET'])
def get_doctor_ratings(request, id):
    try:
        reviews = Ratings.get_for_doctor(id)
        return JsonResponse(reviews, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def rate_doctor(request, id):
    try:
        body = json.loads(request.body or '{}')
        stars = body.get('stars')
        comment = body.get('comment', '')
        if not stars or int(stars) < 1 or int(stars) > 5:
            return JsonResponse({'message': 'Rating must be 1-5'}, status=400)
        doc = Users.find_by_id(id)
        if not doc or doc.get('role') != 'doctor':
            return JsonResponse({'message': 'Doctor not found'}, status=404)
        Ratings.add(id, request.user['_id'], int(stars), comment)
        updated = Users.find_by_id(id)
        return JsonResponse({'rating': updated.get('rating'), 'reviewCount': updated.get('reviewCount')})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

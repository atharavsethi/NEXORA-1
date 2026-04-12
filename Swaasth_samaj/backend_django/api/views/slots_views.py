"""
Slots views — port of routes/slots.js
POST   /api/slots/
GET    /api/slots/my
GET    /api/slots/doctor/<id>
PATCH  /api/slots/<id>
DELETE /api/slots/<id>
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Slots
from middleware.auth import protect, require_role, require_verified


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['POST'])
def create_slot(request):
    try:
        body = json.loads(request.body or '{}')
        day = body.get('day')
        start_time = body.get('startTime')
        end_time = body.get('endTime')
        fee = body.get('fee')
        duration = body.get('duration', 30)

        if not day or not start_time or not end_time or fee is None:
            return JsonResponse({'message': 'day, startTime, endTime and fee are required'}, status=400)

        slot = Slots.create({
            'doctorId': request.user['_id'],
            'day': day, 'startTime': start_time, 'endTime': end_time,
            'fee': float(fee), 'duration': int(duration),
        })
        return JsonResponse(slot, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_role('doctor')
@require_http_methods(['GET'])
def my_slots(request):
    slots = Slots.find({'doctorId': request.user['_id']})
    return JsonResponse(slots, safe=False)


@require_http_methods(['GET'])
def doctor_slots(request, id):
    slots = Slots.find({'doctorId': id, 'isBooked': False})
    return JsonResponse(slots, safe=False)


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['PATCH'])
def update_slot(request, id):
    try:
        slot = Slots.find_by_id(id)
        if not slot:
            return JsonResponse({'message': 'Slot not found'}, status=404)
        if slot['doctorId'] != request.user['_id']:
            return JsonResponse({'message': 'Not your slot'}, status=403)

        body = json.loads(request.body or '{}')
        update = {}
        if 'day' in body:
            update['day'] = body['day']
        if 'startTime' in body:
            update['startTime'] = body['startTime']
        if 'endTime' in body:
            update['endTime'] = body['endTime']
        if 'fee' in body and body['fee'] is not None:
            update['fee'] = float(body['fee'])
        if 'duration' in body:
            update['duration'] = int(body['duration'])

        updated = Slots.find_by_id_and_update(id, update)
        return JsonResponse(updated)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['DELETE'])
def delete_slot(request, id):
    try:
        slot = Slots.find_by_id(id)
        if not slot:
            return JsonResponse({'message': 'Slot not found'}, status=404)
        if slot['doctorId'] != request.user['_id']:
            return JsonResponse({'message': 'Not your slot'}, status=403)
        if slot.get('isBooked'):
            return JsonResponse({'message': 'Cannot delete a booked slot'}, status=400)
        Slots.delete_one(id)
        return JsonResponse({'message': 'Slot deleted'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

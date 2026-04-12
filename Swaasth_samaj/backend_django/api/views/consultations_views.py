"""
Consultations views — port of routes/consultations.js
POST   /api/consultations/
GET    /api/consultations/my
GET    /api/consultations/doctor
POST   /api/consultations/<id>/pay
PATCH  /api/consultations/<id>/accept
PATCH  /api/consultations/<id>/reject
PATCH  /api/consultations/<id>/complete
GET    /api/consultations/<id>
"""
import json
import uuid
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Consultations, Slots, Users
from middleware.auth import protect, require_role, require_verified


def _enrich(c):
    doctor = Users.find_by_id(c.get('doctorId'))
    patient = Users.find_by_id(c.get('patientId'))
    return {
        **c,
        'doctor': {'_id': doctor['_id'], 'name': doctor['name'], 'specialty': doctor.get('specialty'), 'avatar': doctor.get('avatar')} if doctor else None,
        'patient': {'_id': patient['_id'], 'name': patient['name'], 'email': patient.get('email')} if patient else None,
    }


@csrf_exempt
@protect
@require_http_methods(['POST'])
def create_consultation(request):
    try:
        body = json.loads(request.body or '{}')
        doctor_id = body.get('doctorId')
        slot_id = body.get('slotId')
        symptoms = body.get('symptoms', '')

        if not doctor_id or not slot_id:
            return JsonResponse({'message': 'doctorId and slotId are required'}, status=400)

        slot = Slots.find_by_id(slot_id)
        if not slot:
            return JsonResponse({'message': 'Slot not found'}, status=404)
        if slot.get('isBooked'):
            return JsonResponse({'message': 'This slot is already booked. Please choose another.'}, status=400)
        if slot.get('doctorId') != doctor_id:
            return JsonResponse({'message': 'Slot does not belong to this doctor'}, status=400)

        consultation = Consultations.create({
            'patientId': request.user['_id'],
            'doctorId': doctor_id,
            'slotId': slot_id,
            'slotDay': slot.get('day', ''),
            'slotTime': f"{slot.get('startTime')} - {slot.get('endTime')}",
            'fee': slot.get('fee', 0),
            'symptoms': symptoms,
        })
        Slots.find_by_id_and_update(slot_id, {'isBooked': True})
        return JsonResponse(_enrich(consultation), status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def my_consultations(request):
    lst = Consultations.find({'patientId': request.user['_id']})
    lst.sort(key=lambda c: c.get('createdAt', ''), reverse=True)
    return JsonResponse([_enrich(c) for c in lst], safe=False)


@protect
@require_role('doctor')
@require_verified
@require_http_methods(['GET'])
def doctor_consultations(request):
    lst = Consultations.find({'doctorId': request.user['_id']})
    lst.sort(key=lambda c: c.get('createdAt', ''), reverse=True)
    return JsonResponse([_enrich(c) for c in lst], safe=False)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def pay_consultation(request, id):
    try:
        c = Consultations.find_by_id(id)
        if not c:
            return JsonResponse({'message': 'Consultation not found'}, status=404)
        if c.get('patientId') != request.user['_id']:
            return JsonResponse({'message': 'Not your consultation'}, status=403)
        if c.get('status') != 'pending_payment':
            return JsonResponse({'message': f"Cannot pay for a consultation in status: {c.get('status')}"}, status=400)

        payment_id = f"PAY-{str(uuid.uuid4()).split('-')[0].upper()}"
        updated = Consultations.find_by_id_and_update(id, {'status': 'payment_done', 'paymentId': payment_id})
        return JsonResponse({'message': '✅ Payment successful! Awaiting doctor confirmation.', 'consultation': _enrich(updated), 'paymentId': payment_id})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['PATCH'])
def accept_consultation(request, id):
    try:
        c = Consultations.find_by_id(id)
        if not c:
            return JsonResponse({'message': 'Consultation not found'}, status=404)
        if c.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your consultation'}, status=403)
        if c.get('status') != 'payment_done':
            return JsonResponse({'message': 'Can only accept consultations where payment is confirmed'}, status=400)

        body = json.loads(request.body or '{}')
        updated = Consultations.find_by_id_and_update(id, {
            'status': 'accepted',
            'doctorMessage': body.get('doctorMessage', 'Your appointment is confirmed. I will see you at the scheduled time.'),
            'meetLink': body.get('meetLink', ''),
        })
        return JsonResponse({'message': '✅ Consultation accepted', 'consultation': _enrich(updated)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['PATCH'])
def reject_consultation(request, id):
    try:
        c = Consultations.find_by_id(id)
        if not c:
            return JsonResponse({'message': 'Consultation not found'}, status=404)
        if c.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your consultation'}, status=403)
        if c.get('status') not in ('payment_done', 'pending_payment'):
            return JsonResponse({'message': 'Cannot reject consultation in current status'}, status=400)

        body = json.loads(request.body or '{}')
        updated = Consultations.find_by_id_and_update(id, {
            'status': 'rejected',
            'doctorMessage': body.get('doctorMessage', 'Sorry, I am unable to take this appointment. Please try a different slot.'),
        })
        if c.get('slotId'):
            Slots.find_by_id_and_update(c['slotId'], {'isBooked': False})
        return JsonResponse({'message': 'Consultation rejected. Slot freed.', 'consultation': _enrich(updated)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_role('doctor')
@require_verified
@require_http_methods(['PATCH'])
def complete_consultation(request, id):
    try:
        c = Consultations.find_by_id(id)
        if not c:
            return JsonResponse({'message': 'Consultation not found'}, status=404)
        if c.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your consultation'}, status=403)
        if c.get('status') != 'accepted':
            return JsonResponse({'message': 'Can only complete accepted consultations'}, status=400)

        updated = Consultations.find_by_id_and_update(id, {'status': 'completed'})
        Users.find_by_id_and_update(request.user['_id'], {'$inc': {'patientCount': 1}})
        return JsonResponse({'message': '✅ Consultation marked as completed', 'consultation': _enrich(updated)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def get_consultation(request, id):
    c = Consultations.find_by_id(id)
    if not c:
        return JsonResponse({'message': 'Consultation not found'}, status=404)
    if c.get('patientId') != request.user['_id'] and c.get('doctorId') != request.user['_id'] and request.user.get('role') != 'admin':
        return JsonResponse({'message': 'Access denied'}, status=403)
    return JsonResponse(_enrich(c))

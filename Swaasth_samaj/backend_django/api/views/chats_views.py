"""
Chats views — port of routes/chats.js
POST   /api/chats/request
GET    /api/chats/my
GET    /api/chats/doctor
GET    /api/chats/doctor-requests
GET    /api/chats/medical
PATCH  /api/chats/<id>/propose
PATCH  /api/chats/<id>/reject
POST   /api/chats/<id>/pay
PATCH  /api/chats/<id>/open
PATCH  /api/chats/<id>/close
GET    /api/chats/<id>
POST   /api/chats/<id>/messages
GET    /api/chats/<id>/messages
"""
import json
import uuid
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import ChatRequests, ChatMessages, Users, Notifications
from middleware.auth import protect, require_role, require_verified


def _enrich(r):
    doctor = Users.find_by_id(r.get('doctorId'))
    patient = Users.find_by_id(r.get('patientId'))
    return {
        **r,
        'doctor': {'_id': doctor['_id'], 'name': doctor['name'], 'specialty': doctor.get('specialty'), 'avatar': doctor.get('avatar'), 'rating': doctor.get('rating')} if doctor else None,
        'patient': {'_id': patient['_id'], 'name': patient['name'], 'email': patient.get('email')} if patient else None,
    }


@csrf_exempt
@protect
@require_http_methods(['POST'])
def request_chat(request):
    try:
        body = json.loads(request.body or '{}')
        doctor_id = body.get('doctorId')
        concern = body.get('concern')
        if not doctor_id or not concern:
            return JsonResponse({'message': 'doctorId and concern are required'}, status=400)
        doctor = Users.find_by_id(doctor_id)
        if not doctor or doctor.get('role') != 'doctor':
            return JsonResponse({'message': 'Doctor not found'}, status=404)

        chat_req = ChatRequests.create({
            'patientId': request.user['_id'],
            'doctorId': doctor_id,
            'concern': concern,
            'preferredDay': body.get('preferredDay', ''),
            'preferredTime': body.get('preferredTime', ''),
        })
        return JsonResponse(_enrich(chat_req), status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def my_chats(request):
    lst = ChatRequests.find({'patientId': request.user['_id']})
    lst.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    return JsonResponse([_enrich(r) for r in lst], safe=False)


@protect
@require_role('doctor')
@require_verified
@require_http_methods(['GET'])
def doctor_chats(request):
    lst = ChatRequests.find({'doctorId': request.user['_id']})
    lst.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    return JsonResponse([_enrich(r) for r in lst], safe=False)


@protect
@require_verified
@require_http_methods(['GET'])
def medical_chats(request):
    if request.user.get('role') not in ('doctor', 'student'):
        return JsonResponse({'message': 'Only medical professionals can access this endpoint.'}, status=403)
    lst = ChatRequests.find({'doctorId': request.user['_id']})
    lst.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    return JsonResponse([_enrich(r) for r in lst], safe=False)


@csrf_exempt
@protect
@require_verified
@require_http_methods(['PATCH'])
def propose_slot(request, id):
    try:
        if request.user.get('role') not in ('doctor', 'student'):
            return JsonResponse({'message': 'Only medical professionals can propose slots.'}, status=403)
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat request not found'}, status=404)
        if r.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request'}, status=403)
        if r.get('status') != 'pending':
            return JsonResponse({'message': 'Can only propose on pending requests'}, status=400)

        body = json.loads(request.body or '{}')
        proposed_day = body.get('proposedDay')
        proposed_time = body.get('proposedTime')
        fee = body.get('fee')
        if not proposed_day or not proposed_time or fee is None:
            return JsonResponse({'message': 'proposedDay, proposedTime and fee are required'}, status=400)

        updated = ChatRequests.find_by_id_and_update(id, {
            'status': 'slot_proposed',
            'proposedDay': proposed_day,
            'proposedTime': proposed_time,
            'fee': float(fee),
            'duration': int(body.get('duration', 30)),
            'doctorNote': body.get('doctorNote', ''),
        })
        Notifications.create({
            'userId': r['patientId'],
            'text': f"{request.user['name']} proposed a private chat slot: {proposed_day} at {proposed_time}",
            'link': '/private-chats',
        })
        return JsonResponse(_enrich(updated))
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_verified
@require_http_methods(['PATCH'])
def reject_chat(request, id):
    try:
        if request.user.get('role') not in ('doctor', 'student'):
            return JsonResponse({'message': 'Only medical professionals can reject requests.'}, status=403)
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat request not found'}, status=404)
        if r.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request'}, status=403)

        body = json.loads(request.body or '{}')
        updated = ChatRequests.find_by_id_and_update(id, {
            'status': 'rejected',
            'doctorNote': body.get('doctorNote', 'I am unable to accept this chat request at the moment.'),
        })
        return JsonResponse(_enrich(updated))
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def pay_chat(request, id):
    try:
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat request not found'}, status=404)
        if r.get('patientId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request'}, status=403)
        if r.get('status') != 'slot_proposed':
            return JsonResponse({'message': 'Payment is only allowed after doctor proposes a slot'}, status=400)

        payment_id = f"CHAT-PAY-{str(uuid.uuid4()).split('-')[0].upper()}"
        updated = ChatRequests.find_by_id_and_update(id, {'status': 'payment_done', 'paymentId': payment_id})
        return JsonResponse({'message': '✅ Payment confirmed! Your private chat room is being prepared.', 'request': _enrich(updated), 'paymentId': payment_id})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_verified
@require_http_methods(['PATCH'])
def open_chat(request, id):
    try:
        if request.user.get('role') not in ('doctor', 'student'):
            return JsonResponse({'message': 'Only medical professionals can open chats.'}, status=403)
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat request not found'}, status=404)
        if r.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request'}, status=403)
        if r.get('status') != 'payment_done':
            return JsonResponse({'message': 'Chat can only be opened after payment is confirmed'}, status=400)

        updated = ChatRequests.find_by_id_and_update(id, {'status': 'active'})
        Notifications.create({
            'userId': r['patientId'],
            'text': f"{request.user['name']} has entered your private chat room! You can now send messages.",
            'link': '/private-chats',
        })
        return JsonResponse({'message': '✅ Chat room is now open', 'request': _enrich(updated)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_verified
@require_http_methods(['PATCH'])
def close_chat(request, id):
    try:
        if request.user.get('role') not in ('doctor', 'student'):
            return JsonResponse({'message': 'Only medical professionals can close chats.'}, status=403)
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat request not found'}, status=404)
        if r.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Not your request'}, status=403)
        if r.get('status') != 'active':
            return JsonResponse({'message': 'Only active chats can be closed'}, status=400)

        from datetime import datetime, timezone
        updated = ChatRequests.find_by_id_and_update(id, {
            'status': 'completed',
            'closedAt': datetime.now(timezone.utc).isoformat(),
        })
        Users.find_by_id_and_update(request.user['_id'], {'$inc': {'patientCount': 1}})
        return JsonResponse({'message': '✅ Chat session marked as completed', 'request': _enrich(updated)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def get_chat(request, id):
    r = ChatRequests.find_by_id(id)
    if not r:
        return JsonResponse({'message': 'Chat request not found'}, status=404)
    if r.get('patientId') != request.user['_id'] and r.get('doctorId') != request.user['_id'] and request.user.get('role') != 'admin':
        return JsonResponse({'message': 'Access denied'}, status=403)

    msgs = sorted(ChatMessages.find({'chatId': id}), key=lambda m: m.get('createdAt', ''))
    return JsonResponse({**_enrich(r), 'messages': msgs})


@csrf_exempt
@protect
@require_http_methods(['POST'])
def send_message(request, id):
    try:
        r = ChatRequests.find_by_id(id)
        if not r:
            return JsonResponse({'message': 'Chat not found'}, status=404)
        if r.get('patientId') != request.user['_id'] and r.get('doctorId') != request.user['_id']:
            return JsonResponse({'message': 'Access denied'}, status=403)
        if r.get('status') != 'active':
            return JsonResponse({'message': 'Chat is not active. Messages cannot be sent.'}, status=400)

        body = json.loads(request.body or '{}')
        text = (body.get('text') or '').strip()
        if not text:
            return JsonResponse({'message': 'Message text is required'}, status=400)

        msg = ChatMessages.create({
            'chatId': id,
            'senderId': request.user['_id'],
            'senderName': request.user['name'],
            'senderRole': request.user['role'],
            'text': text,
        })
        return JsonResponse(msg, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def get_messages(request, id):
    r = ChatRequests.find_by_id(id)
    if not r:
        return JsonResponse({'message': 'Chat not found'}, status=404)
    if r.get('patientId') != request.user['_id'] and r.get('doctorId') != request.user['_id']:
        return JsonResponse({'message': 'Access denied'}, status=403)

    msgs = sorted(ChatMessages.find({'chatId': id}), key=lambda m: m.get('createdAt', ''))
    return JsonResponse(msgs, safe=False)

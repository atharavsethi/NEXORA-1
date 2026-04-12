"""
Admin views — port of routes/admin.js
GET    /api/admin/stats
GET    /api/admin/pending-verifications
PUT    /api/admin/verify/<userId>
GET    /api/admin/pending-answers
PUT    /api/admin/answers/<id>
GET    /api/admin/all-users
GET    /api/admin/support-tickets
PATCH  /api/admin/support-tickets/<id>
POST   /api/admin/login
"""
import json
import jwt
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Users, Answers, Questions, SupportTickets
from middleware.auth import protect, require_role

ADMIN_EMAIL = 'mk1222846@gmail.com'
ADMIN_PASS = 'admin123'
JWT_SECRET = getattr(settings, 'JWT_SECRET', 'swasth_secret_2024')

admin_only = [protect, require_role('admin')]


def _admin_protect(view_func):
    return protect(require_role('admin')(view_func))


@_admin_protect
@require_http_methods(['GET'])
def stats(request):
    try:
        total_users = Users.count_documents({'role': 'user'})
        verified_doctors = len(Users.find({'role': 'doctor', 'verified': True}))
        verified_students = len(Users.find({'role': 'student', 'verified': True}))
        total_doctors = verified_doctors + verified_students
        pending_verif = len([u for u in Users.find({}) if u.get('role') in ('doctor', 'student') and not u.get('verified')])
        total_questions = Questions.count_documents({})
        pending_answers = Answers.count_documents({'status': 'pending'})
        total_answers = Answers.count_documents({'status': 'approved'})
        open_tickets = len([t for t in SupportTickets.find({}) if t.get('status') != 'resolved'])
        return JsonResponse({
            'totalUsers': total_users, 'totalDoctors': total_doctors,
            'verifiedDoctors': verified_doctors, 'verifiedStudents': verified_students,
            'pendingVerifications': pending_verif, 'totalQuestions': total_questions,
            'pendingAnswers': pending_answers, 'totalAnswers': total_answers,
            'openTickets': open_tickets,
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@_admin_protect
@require_http_methods(['GET'])
def pending_verifications(request):
    try:
        pending = [u for u in Users.find({}) if u.get('role') in ('doctor', 'student') and not u.get('verified')]
        sanitized = sorted([{k: v for k, v in u.items() if k != 'password'} for u in pending],
                           key=lambda x: x.get('createdAt', ''), reverse=True)
        return JsonResponse(sanitized, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@_admin_protect
@require_http_methods(['PUT'])
def verify_user(request, user_id):
    try:
        body = json.loads(request.body or '{}')
        approved = bool(body.get('approved'))
        user = Users.find_by_id_and_update(user_id, {'verified': approved})
        if not user:
            return JsonResponse({'message': 'User not found'}, status=404)
        out = {k: v for k, v in user.items() if k != 'password'}
        return JsonResponse({'message': 'User verified' if approved else 'User rejected', 'user': out})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@_admin_protect
@require_http_methods(['GET'])
def pending_answers(request):
    try:
        pending = Answers.find({'status': 'pending'})
        populated = []
        for a in sorted(pending, key=lambda x: x.get('createdAt', '')):
            doctor = Users.find_by_id(a.get('doctorId'))
            question = Questions.find_by_id(a.get('questionId'))
            populated.append({
                **a,
                'doctor': {'name': doctor['name'], 'specialty': doctor.get('specialty'), 'verified': doctor.get('verified')} if doctor else None,
                'question': {'title': question['title'], 'category': question.get('category')} if question else None,
            })
        return JsonResponse(populated, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@_admin_protect
@require_http_methods(['PUT'])
def update_answer(request, id):
    try:
        body = json.loads(request.body or '{}')
        status = body.get('status')
        admin_note = body.get('adminNote', '')
        answer = Answers.find_by_id(id)
        if not answer:
            return JsonResponse({'message': 'Answer not found'}, status=404)
        Answers.find_by_id_and_update(id, {'status': status, 'adminNote': admin_note})
        if status == 'approved':
            q = Questions.find_by_id(answer.get('questionId'))
            if q:
                Questions.find_by_id_and_update(answer['questionId'], {'status': 'answered'})
        return JsonResponse({'message': f'Answer {status}', 'answer': Answers.find_by_id(id)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@_admin_protect
@require_http_methods(['GET'])
def all_users(request):
    try:
        all_ = sorted([{k: v for k, v in u.items() if k != 'password'} for u in Users.find({})],
                      key=lambda x: x.get('createdAt', ''), reverse=True)
        return JsonResponse(all_, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@_admin_protect
@require_http_methods(['GET'])
def support_tickets(request):
    try:
        tickets = []
        for t in sorted(SupportTickets.find({}), key=lambda x: x.get('createdAt', ''), reverse=True):
            user = Users.find_by_id(t.get('userId'))
            tickets.append({**t, 'userName': user['name'] if user else 'Unknown', 'userEmail': user.get('email', '') if user else ''})
        return JsonResponse(tickets, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@_admin_protect
@require_http_methods(['PATCH'])
def update_support_ticket(request, id):
    try:
        body = json.loads(request.body or '{}')
        ticket = SupportTickets.find_by_id_and_update(id, {
            'status': body.get('status', 'pending'),
            'response': body.get('response', ''),
        })
        if not ticket:
            return JsonResponse({'message': 'Ticket not found'}, status=404)
        return JsonResponse(ticket)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def admin_login(request):
    body = json.loads(request.body or '{}')
    email = body.get('email', '')
    password = body.get('password', '')
    if email == ADMIN_EMAIL and password == ADMIN_PASS:
        admin = Users.find_one({'role': 'admin'})
        if not admin:
            return JsonResponse({'message': 'Admin account not seeded'}, status=500)
        token = jwt.encode({'id': admin['_id'], 'name': admin['name'], 'email': admin['email'],
                            'role': 'admin', 'verified': True},
                           JWT_SECRET, algorithm='HS256')
        out = {k: v for k, v in admin.items() if k != 'password'}
        out['token'] = token
        return JsonResponse(out)
    return JsonResponse({'message': 'Invalid admin credentials'}, status=401)

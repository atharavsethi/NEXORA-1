"""
Auth views — port of routes/auth.js
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PATCH  /api/auth/profile
GET    /api/auth/doctor-stats
"""
import os
import json
import jwt
import bcrypt
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Users, Notifications, Answers, Consultations, LoungePosts, ChatRequests, Ratings
from middleware.auth import protect


JWT_SECRET = getattr(settings, 'JWT_SECRET', 'swasth_secret_2024')
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _generate_token(user):
    payload = {
        'id': user['_id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'verified': user['verified'],
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def _safe_user(user):
    return {k: v for k, v in user.items() if k != 'password'}


@csrf_exempt
@require_http_methods(['POST'])
def register(request):
    try:
        # Handle multipart (file upload) or JSON
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            name = data.get('name', '').strip()
            email = data.get('email', '').lower().strip()
            password = data.get('password', '')
            role = data.get('role', 'user')
            specialty = data.get('specialty', '')
            institution = data.get('institution', '')
            experience = data.get('experience', '')
            license_number = data.get('licenseNumber', '')
            student_id = data.get('studentId', '')
            college = data.get('college', '')
            year_of_study = data.get('yearOfStudy', '')
            credential_file = request.FILES.get('credential')
        else:
            body = json.loads(request.body or '{}')
            name = body.get('name', '').strip()
            email = body.get('email', '').lower().strip()
            password = body.get('password', '')
            role = body.get('role', 'user')
            specialty = body.get('specialty', '')
            institution = body.get('institution', '')
            experience = body.get('experience', '')
            license_number = body.get('licenseNumber', '')
            student_id = body.get('studentId', '')
            college = body.get('college', '')
            year_of_study = body.get('yearOfStudy', '')
            credential_file = None

        if not name or not email or not password:
            return JsonResponse({'message': 'Name, email and password are required'}, status=400)
        if len(password) < 6:
            return JsonResponse({'message': 'Password must be at least 6 characters'}, status=400)
        if Users.find_one({'email': email}):
            return JsonResponse({'message': 'Email already registered. Please login.'}, status=400)
        if role == 'doctor' and not license_number:
            return JsonResponse({'message': 'MBBS/Government Registration Number is required for doctors'}, status=400)
        if role == 'student' and not student_id:
            return JsonResponse({'message': 'College Student ID is required for medical students'}, status=400)
        if role in ('doctor', 'student') and not credential_file:
            return JsonResponse({'message': 'Credential document is required for doctors/students'}, status=400)

        credential_url = None
        if credential_file:
            ext = os.path.splitext(credential_file.name)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                return JsonResponse({'message': 'Only JPG, PNG, PDF files are allowed'}, status=400)
            if credential_file.size > MAX_FILE_SIZE:
                return JsonResponse({'message': 'File size must be under 5MB'}, status=400)
            save_dir = os.path.join(settings.MEDIA_ROOT, 'credentials')
            os.makedirs(save_dir, exist_ok=True)
            import time
            filename = f"{int(time.time() * 1000)}-{credential_file.name}"
            fpath = os.path.join(save_dir, filename)
            with open(fpath, 'wb') as f:
                for chunk in credential_file.chunks():
                    f.write(chunk)
            credential_url = f'/uploads/credentials/{filename}'

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        user = Users.create({
            'name': name, 'email': email, 'password': hashed,
            'role': role,
            'specialty': specialty, 'institution': institution,
            'experience': experience, 'licenseNumber': license_number,
            'studentId': student_id, 'college': college,
            'yearOfStudy': year_of_study,
            'credentialUrl': credential_url,
        })
        out = _safe_user(user)
        out['token'] = _generate_token(user)
        return JsonResponse(out, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e) or 'Registration failed'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        body = json.loads(request.body or '{}')
        email = body.get('email', '').lower().strip()
        password = body.get('password', '')
        role = body.get('role', '')
        license_number = body.get('licenseNumber', '')
        student_id = body.get('studentId', '')

        if not email or not password:
            return JsonResponse({'message': 'Email and password are required'}, status=400)

        user = Users.find_one({'email': email})
        if not user:
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

        if not bcrypt.checkpw(password.encode(), user['password'].encode()):
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

        # Role-specific secondary verification
        if role == 'doctor' or user['role'] == 'doctor':
            if user['role'] != 'doctor':
                return JsonResponse({'message': 'This account is not registered as a doctor.'}, status=403)
            if not license_number:
                return JsonResponse({'message': 'License / Government Registration ID is required for doctor login.'}, status=400)
            if user.get('licenseNumber', '').lower() != license_number.lower().strip():
                return JsonResponse({'message': 'License/Gov ID does not match records. Access denied.'}, status=401)
            if not user.get('verified'):
                return JsonResponse({'message': 'Your doctor account is pending admin verification. You will be notified once approved.'}, status=403)

        if role == 'student' or user['role'] == 'student':
            if user['role'] != 'student':
                return JsonResponse({'message': 'This account is not registered as a student.'}, status=403)
            if not student_id:
                return JsonResponse({'message': 'College Student ID is required for student login.'}, status=400)
            if user.get('studentId', '').lower() != student_id.lower().strip():
                return JsonResponse({'message': 'Student ID does not match records. Access denied.'}, status=401)
            if not user.get('verified'):
                return JsonResponse({'message': 'Your student account is pending admin verification. You will be notified once approved.'}, status=403)

        Notifications.create({
            'userId': user['_id'],
            'text': f"Welcome back, {user['name']}! You are successfully logged in.",
        })

        out = _safe_user(user)
        out['token'] = _generate_token(user)
        return JsonResponse(out)
    except Exception as e:
        return JsonResponse({'message': str(e) or 'Login failed'}, status=500)


@protect
@require_http_methods(['GET'])
def me(request):
    out = _safe_user(request.user)
    return JsonResponse(out)


@csrf_exempt
@protect
@require_http_methods(['PATCH'])
def profile(request):
    try:
        body = json.loads(request.body or '{}')
        updates = {}
        for field in ('name', 'bio', 'gender', 'age', 'bloodGroup', 'phone',
                      'specialty', 'institution', 'experience', 'responseTime'):
            if field in body:
                updates[field] = body[field]
        if 'consultationFee' in body:
            try:
                updates['consultationFee'] = float(body['consultationFee'])
            except (ValueError, TypeError):
                updates['consultationFee'] = 0

        updated = Users.find_by_id_and_update(request.user['_id'], updates)
        return JsonResponse(_safe_user(updated))
    except Exception as e:
        return JsonResponse({'message': str(e) or 'Update failed'}, status=500)


@protect
@require_http_methods(['GET'])
def doctor_stats(request):
    try:
        uid = request.user['_id']

        my_answers = Answers.find({'doctorId': uid})
        my_consultations = Consultations.find({'doctorId': uid})
        my_posts = LoungePosts.find({'authorId': uid})
        chat_requests = ChatRequests.find({'doctorId': uid})
        ratings = Ratings.get_for_doctor(uid)

        pending = sum(1 for a in my_answers if a['status'] == 'pending')
        approved = sum(1 for a in my_answers if a['status'] == 'approved')
        rejected = sum(1 for a in my_answers if a['status'] == 'rejected')

        consult_pending = sum(1 for c in my_consultations if c['status'] == 'payment_done')
        consult_active = sum(1 for c in my_consultations if c['status'] == 'accepted')
        consult_completed = sum(1 for c in my_consultations if c['status'] == 'completed')

        fresh_user = Users.find_by_id(uid) or request.user
        return JsonResponse({
            'answers': {'total': len(my_answers), 'pending': pending, 'approved': approved, 'rejected': rejected},
            'consultations': {'total': len(my_consultations), 'pending': consult_pending, 'active': consult_active, 'completed': consult_completed},
            'loungePosts': len(my_posts),
            'chatRequests': len(chat_requests),
            'rating': fresh_user.get('rating', 0),
            'reviewCount': fresh_user.get('reviewCount', 0),
            'patientCount': fresh_user.get('patientCount', 0),
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

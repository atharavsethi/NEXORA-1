"""
JWT authentication middleware — Python port of backend/middleware/auth.js
Provides:
  - protect(view_func)     → decorator that requires a valid JWT
  - require_role(*roles)   → decorator factory that checks user role
  - require_verified       → decorator that checks user.verified
"""
import functools
import jwt
from django.conf import settings
from django.http import JsonResponse
from store.store import Users


def _get_token(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Bearer '):
        return auth.split(' ', 1)[1]
    return None


def protect(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        token = _get_token(request)
        if not token:
            return JsonResponse({'message': 'Not authorized, no token'}, status=401)
        try:
            secret = getattr(settings, 'JWT_SECRET', 'swasth_secret_2024')
            decoded = jwt.decode(token, secret, algorithms=['HS256'])

            # Primary: look up from in-memory store
            user = Users.find_by_id(decoded.get('id'))

            # Fallback A: token has name/email/role embedded
            if not user and decoded.get('name'):
                user = {
                    '_id': decoded['id'],
                    'name': decoded['name'],
                    'email': decoded.get('email', ''),
                    'role': decoded.get('role', 'user'),
                    'verified': decoded.get('verified', True),
                }

            # Fallback B: X-User-* headers
            if not user:
                header_name = request.META.get('HTTP_X_USER_NAME')
                if header_name:
                    user = {
                        '_id': decoded['id'],
                        'name': header_name,
                        'email': request.META.get('HTTP_X_USER_EMAIL', ''),
                        'role': request.META.get('HTTP_X_USER_ROLE', 'user'),
                        'verified': True,
                    }

            # Fallback C: ghost user
            if not user:
                user = {
                    '_id': decoded['id'],
                    'name': 'User',
                    'email': '',
                    'role': decoded.get('role', 'user'),
                    'verified': decoded.get('verified', True),
                }

            request.user = user
            return view_func(request, *args, **kwargs)

        except jwt.ExpiredSignatureError:
            return JsonResponse({'message': 'Token invalid or expired'}, status=401)
        except Exception:
            return JsonResponse({'message': 'Token invalid or expired'}, status=401)

    return wrapper


def require_role(*roles):
    """Usage: @require_role('doctor') or @require_role('doctor', 'student')"""
    # support single list arg too
    flat_roles = []
    for r in roles:
        if isinstance(r, (list, tuple)):
            flat_roles.extend(r)
        else:
            flat_roles.append(r)

    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if request.user.get('role') not in flat_roles:
                return JsonResponse(
                    {'message': f"Role '{request.user.get('role')}' is not authorized"},
                    status=403
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_verified(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.get('verified'):
            return JsonResponse(
                {'message': 'Your account is pending verification by admin.'},
                status=403
            )
        return view_func(request, *args, **kwargs)
    return wrapper

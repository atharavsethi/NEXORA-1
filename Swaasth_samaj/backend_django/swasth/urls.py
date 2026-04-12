"""
Root URL configuration for Swasth Samaj Django backend.
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok', 'db': 'in-memory', 'platform': 'Swasth Samaj'})


urlpatterns = [
    path('api/health', health_check),
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

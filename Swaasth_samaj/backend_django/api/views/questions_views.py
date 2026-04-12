"""
Questions views — port of routes/questions.js
GET    /api/questions/
GET    /api/questions/my
GET    /api/questions/<id>
POST   /api/questions/
PUT    /api/questions/<id>/upvote
DELETE /api/questions/<id>
"""
import os
import json
import time
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Questions, Users
from middleware.auth import protect


@require_http_methods(['GET'])
def list_questions(request):
    try:
        category = request.GET.get('category')
        status = request.GET.get('status')
        search = request.GET.get('search')
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))

        filter_ = {}
        if category:
            filter_['category'] = category
        if status:
            filter_['status'] = status

        results = Questions.find(filter_)

        if search:
            import re
            rx = re.compile(search, re.IGNORECASE)
            results = [q for q in results if rx.search(q.get('title', '')) or rx.search(q.get('description', ''))]

        results.sort(key=lambda q: q.get('createdAt', ''), reverse=True)

        results = [{
            **q,
            'user': (lambda u: {'_id': u['_id'], 'name': u['name'], 'role': u['role'], 'verified': u['verified']} if u else None)(Users.find_by_id(q.get('userId')))
        } for q in results]

        total = len(results)
        paginated = results[(page - 1) * limit: page * limit]
        import math
        return JsonResponse({'questions': paginated, 'total': total, 'page': page, 'pages': math.ceil(total / limit)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@protect
@require_http_methods(['GET'])
def my_questions(request):
    try:
        qs = Questions.find({'userId': request.user['_id']})
        qs.sort(key=lambda q: q.get('createdAt', ''), reverse=True)
        return JsonResponse(qs, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(['GET'])
def get_question(request, id):
    try:
        q = Questions.find_by_id(id)
        if not q:
            return JsonResponse({'message': 'Question not found'}, status=404)
        Questions.find_by_id_and_update(id, {'views': (q.get('views') or 0) + 1})
        user = Users.find_by_id(q.get('userId'))
        return JsonResponse({
            **q,
            'user': {'_id': user['_id'], 'name': user['name'], 'role': user['role'], 'verified': user['verified'], 'avatar': user.get('avatar')} if user else None
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def create_question(request):
    try:
        # Handle multipart or JSON
        if request.content_type and 'multipart' in request.content_type:
            title = request.POST.get('title', '')
            description = request.POST.get('description', '')
            category = request.POST.get('category', 'General')
            image_file = request.FILES.get('image')
        else:
            body = json.loads(request.body or '{}')
            title = body.get('title', '')
            description = body.get('description', '')
            category = body.get('category', 'General')
            image_file = None

        if not title:
            return JsonResponse({'message': 'Title is required'}, status=400)

        image_url = None
        if image_file:
            save_dir = os.path.join(settings.MEDIA_ROOT, 'questions')
            os.makedirs(save_dir, exist_ok=True)
            filename = f"{int(time.time() * 1000)}-{image_file.name}"
            with open(os.path.join(save_dir, filename), 'wb') as f:
                for chunk in image_file.chunks():
                    f.write(chunk)
            image_url = f'/uploads/questions/{filename}'

        question = Questions.create({
            'title': title, 'description': description,
            'category': category, 'userId': request.user['_id'],
            'imageUrl': image_url,
        })
        return JsonResponse(question, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PUT'])
def upvote_question(request, id):
    try:
        q = Questions.find_by_id(id)
        if not q:
            return JsonResponse({'message': 'Not found'}, status=404)
        upvotes = q.get('upvotes') or []
        uid = request.user['_id']
        if uid in upvotes:
            upvotes.remove(uid)
        else:
            upvotes.append(uid)
        Questions.find_by_id_and_update(id, {'upvotes': upvotes})
        return JsonResponse({'upvotes': len(upvotes)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['DELETE'])
def delete_question(request, id):
    try:
        q = Questions.find_by_id(id)
        if not q:
            return JsonResponse({'message': 'Not found'}, status=404)
        if q['userId'] != request.user['_id'] and request.user.get('role') != 'admin':
            return JsonResponse({'message': 'Not authorized'}, status=403)
        Questions.delete_one(id)
        return JsonResponse({'message': 'Question deleted'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

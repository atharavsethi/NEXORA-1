"""
Answers views — port of routes/answers.js
GET  /api/answers/my
GET  /api/answers/question/<questionId>
POST /api/answers/
PUT  /api/answers/<id>/upvote
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from store.store import Answers, Questions, Users, Notifications
from middleware.auth import protect


@protect
@require_http_methods(['GET'])
def my_answers(request):
    try:
        mine = Answers.find({'doctorId': request.user['_id']})
        populated = []
        for a in sorted(mine, key=lambda x: x.get('createdAt', ''), reverse=True):
            q = Questions.find_by_id(a.get('questionId'))
            populated.append({
                **a,
                'question': {'_id': q['_id'], 'title': q['title'], 'category': q['category'], 'status': q['status']} if q else None
            })
        return JsonResponse(populated, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(['GET'])
def answers_for_question(request, question_id):
    try:
        answers = Answers.find({'questionId': question_id, 'status': 'approved'})
        populated = []
        for a in sorted(answers, key=lambda x: x.get('createdAt', ''), reverse=True):
            doc = Users.find_by_id(a.get('doctorId'))
            populated.append({
                **a,
                'doctor': {'_id': doc['_id'], 'name': doc['name'], 'role': doc['role'], 'verified': doc['verified'],
                           'specialty': doc.get('specialty'), 'institution': doc.get('institution'),
                           'avatar': doc.get('avatar'), 'rating': doc.get('rating')} if doc else None
            })
        return JsonResponse(populated, safe=False)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['POST'])
def create_answer(request):
    try:
        if request.user.get('role') not in ('doctor', 'student', 'admin'):
            return JsonResponse({'message': 'Only verified doctors and medical students can post answers in the forum.'}, status=403)
        if not request.user.get('verified'):
            return JsonResponse({'message': 'Your credentials are still under review. You can post answers once an admin approves your account.'}, status=403)

        body = json.loads(request.body or '{}')
        question_id = body.get('questionId')
        text = body.get('text')
        if not question_id or not text:
            return JsonResponse({'message': 'questionId and text required'}, status=400)

        question = Questions.find_by_id(question_id)
        if not question:
            return JsonResponse({'message': 'Question not found'}, status=404)

        answer = Answers.create({'questionId': question_id, 'doctorId': request.user['_id'], 'text': text})
        Questions.find_by_id_and_update(question_id, {'answersCount': (question.get('answersCount') or 0) + 1})

        if question.get('userId') != request.user['_id']:
            Notifications.create({
                'userId': question['userId'],
                'text': f"A verified professional ({request.user['name']}) responded to your query: \"{question['title']}\"",
                'link': f"/forum/{question_id}"
            })

        return JsonResponse(answer, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
@protect
@require_http_methods(['PUT'])
def upvote_answer(request, id):
    try:
        a = Answers.find_by_id(id)
        if not a or a.get('status') != 'approved':
            return JsonResponse({'message': 'Not found'}, status=404)
        upvotes = a.get('upvotes') or []
        uid = request.user['_id']
        if uid in upvotes:
            upvotes.remove(uid)
        else:
            upvotes.append(uid)
        Answers.find_by_id_and_update(id, {'upvotes': upvotes})
        return JsonResponse({'upvotes': len(upvotes)})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

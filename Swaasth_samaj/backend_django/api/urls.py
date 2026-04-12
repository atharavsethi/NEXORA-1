"""
API URL configuration — maps all endpoints exactly matching the Node.js routes.
Uses method-dispatching wrappers for paths that handle multiple HTTP methods.
"""
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# ─── View imports ─────────────────────────────────────────────────────────────
from api.views import auth_views, questions_views, answers_views, admin_views
from api.views import doctors_views, slots_views, consultations_views
from api.views import chats_views, blood_views, misc_views


def _dispatch(**method_map):
    """
    Returns a single view that dispatches to sub-views based on HTTP method.
    e.g. _dispatch(GET=list_view, POST=create_view)
    """
    @csrf_exempt
    def view(request, *args, **kwargs):
        handler = method_map.get(request.method)
        if handler:
            return handler(request, *args, **kwargs)
        return JsonResponse({'message': f'Method {request.method} not allowed'}, status=405)
    return view


urlpatterns = [

    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/register',     auth_views.register,     name='auth-register'),
    path('auth/login',        auth_views.login,         name='auth-login'),
    path('auth/me',           auth_views.me,            name='auth-me'),
    path('auth/profile',      auth_views.profile,       name='auth-profile'),
    path('auth/doctor-stats', auth_views.doctor_stats,  name='auth-doctor-stats'),

    # ── Questions ─────────────────────────────────────────────────────────────
    path('questions', _dispatch(
        GET=questions_views.list_questions,
        POST=questions_views.create_question,
    ), name='questions-list-create'),
    path('questions/', _dispatch(
        GET=questions_views.list_questions,
        POST=questions_views.create_question,
    ), name='questions-list-create-alt'),
    path('questions/my',  questions_views.my_questions, name='questions-my'),
    path('questions/<str:id>/upvote', questions_views.upvote_question, name='questions-upvote'),
    path('questions/<str:id>', _dispatch(
        GET=questions_views.get_question,
        DELETE=questions_views.delete_question,
    ), name='questions-detail'),

    # ── Answers ───────────────────────────────────────────────────────────────
    path('answers', _dispatch(
        POST=answers_views.create_answer,
    ), name='answers-create'),
    path('answers/', _dispatch(
        POST=answers_views.create_answer,
    ), name='answers-create-alt'),
    path('answers/my', answers_views.my_answers, name='answers-my'),
    path('answers/question/<str:question_id>', answers_views.answers_for_question, name='answers-for-question'),
    path('answers/<str:id>/upvote', answers_views.upvote_answer, name='answers-upvote'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/login',                         admin_views.admin_login,           name='admin-login'),
    path('admin/stats',                         admin_views.stats,                 name='admin-stats'),
    path('admin/pending-verifications',         admin_views.pending_verifications, name='admin-pending-verif'),
    path('admin/verify/<str:user_id>',          admin_views.verify_user,           name='admin-verify'),
    path('admin/pending-answers',               admin_views.pending_answers,       name='admin-pending-answers'),
    path('admin/answers/<str:id>',              admin_views.update_answer,         name='admin-update-answer'),
    path('admin/all-users',                     admin_views.all_users,             name='admin-all-users'),
    path('admin/support-tickets', _dispatch(
        GET=admin_views.support_tickets,
    ), name='admin-support-tickets'),
    path('admin/support-tickets/<str:id>', _dispatch(
        PATCH=admin_views.update_support_ticket,
    ), name='admin-update-ticket'),

    # ── Articles ──────────────────────────────────────────────────────────────
    path('articles', _dispatch(
        GET=misc_views.list_articles,
        POST=misc_views.create_article,
    ), name='articles-list-create'),
    path('articles/', _dispatch(
        GET=misc_views.list_articles,
        POST=misc_views.create_article,
    ), name='articles-list-create-alt'),
    path('articles/<str:id>/approve', misc_views.approve_article, name='articles-approve'),

    # ── Doctors ───────────────────────────────────────────────────────────────
    path('doctors',                 doctors_views.list_doctors,       name='doctors-list'),
    path('doctors/',                 doctors_views.list_doctors,       name='doctors-list-alt'),
    path('doctors/<str:id>/ratings', doctors_views.get_doctor_ratings, name='doctors-ratings'),
    path('doctors/<str:id>/rate',    doctors_views.rate_doctor,        name='doctors-rate'),
    path('doctors/<str:id>',         doctors_views.get_doctor,         name='doctors-get'),

    # ── Hospitals ─────────────────────────────────────────────────────────────
    path('hospitals/blood-donors', misc_views.hospital_blood_donors, name='hospitals-blood-donors'),
    path('hospitals',             misc_views.list_hospitals,         name='hospitals-list'),
    path('hospitals/',             misc_views.list_hospitals,         name='hospitals-list-alt'),

    # ── Slots ─────────────────────────────────────────────────────────────────
    path('slots', _dispatch(
        POST=slots_views.create_slot,
    ), name='slots-create'),
    path('slots/', _dispatch(
        POST=slots_views.create_slot,
    ), name='slots-create-alt'),
    path('slots/my',              slots_views.my_slots,     name='slots-my'),
    path('slots/doctor/<str:id>', slots_views.doctor_slots, name='slots-doctor'),
    path('slots/<str:id>', _dispatch(
        PATCH=slots_views.update_slot,
        DELETE=slots_views.delete_slot,
    ), name='slots-detail'),

    # ── Consultations ─────────────────────────────────────────────────────────
    path('consultations', _dispatch(
        POST=consultations_views.create_consultation,
    ), name='consult-create'),
    path('consultations/', _dispatch(
        POST=consultations_views.create_consultation,
    ), name='consult-create-alt'),
    path('consultations/my',                   consultations_views.my_consultations,     name='consult-my'),
    path('consultations/doctor',               consultations_views.doctor_consultations, name='consult-doctor'),
    path('consultations/<str:id>/pay',         consultations_views.pay_consultation,     name='consult-pay'),
    path('consultations/<str:id>/accept',      consultations_views.accept_consultation,  name='consult-accept'),
    path('consultations/<str:id>/reject',      consultations_views.reject_consultation,  name='consult-reject'),
    path('consultations/<str:id>/complete',    consultations_views.complete_consultation, name='consult-complete'),
    path('consultations/<str:id>',             consultations_views.get_consultation,     name='consult-get'),

    # ── Chats ─────────────────────────────────────────────────────────────────
    path('chats/request',         chats_views.request_chat,  name='chats-request'),
    path('chats/my',              chats_views.my_chats,      name='chats-my'),
    path('chats/doctor-requests', chats_views.doctor_chats,  name='chats-doctor-requests'),
    path('chats/doctor',          chats_views.doctor_chats,  name='chats-doctor'),
    path('chats/medical',         chats_views.medical_chats, name='chats-medical'),
    path('chats/<str:id>/propose', chats_views.propose_slot, name='chats-propose'),
    path('chats/<str:id>/reject',  chats_views.reject_chat,  name='chats-reject'),
    path('chats/<str:id>/pay',     chats_views.pay_chat,     name='chats-pay'),
    path('chats/<str:id>/open',    chats_views.open_chat,    name='chats-open'),
    path('chats/<str:id>/close',   chats_views.close_chat,   name='chats-close'),
    path('chats/<str:id>/messages', _dispatch(
        GET=chats_views.get_messages,
        POST=chats_views.send_message,
    ), name='chats-messages'),
    path('chats/<str:id>',         chats_views.get_chat,     name='chats-get'),

    # ── Notifications ─────────────────────────────────────────────────────────
    path('notifications',              misc_views.list_notifications,     name='notif-list'),
    path('notifications/',              misc_views.list_notifications,     name='notif-list-alt'),
    path('notifications/read-all',      misc_views.read_all_notifications, name='notif-read-all'),
    path('notifications/<str:id>/read', misc_views.read_notification,      name='notif-read'),

    # ── FAQs ──────────────────────────────────────────────────────────────────
    path('faqs', _dispatch(
        GET=misc_views.list_faqs,
        POST=misc_views.create_faq,
    ), name='faqs'),
    path('faqs/', _dispatch(
        GET=misc_views.list_faqs,
        POST=misc_views.create_faq,
    ), name='faqs-alt'),

    # ── Support ───────────────────────────────────────────────────────────────
    path('support/my', misc_views.my_support,    name='support-my'),
    path('support', _dispatch(
        POST=misc_views.create_support,
    ), name='support-create'),
    path('support/', _dispatch(
        POST=misc_views.create_support,
    ), name='support-create-alt'),

    # ── Lounge ────────────────────────────────────────────────────────────────
    path('lounge', _dispatch(
        GET=misc_views.list_lounge,
        POST=misc_views.create_lounge_post,
    ), name='lounge-list-create'),
    path('lounge/', _dispatch(
        GET=misc_views.list_lounge,
        POST=misc_views.create_lounge_post,
    ), name='lounge-list-create-alt'),
    path('lounge/my',                misc_views.my_lounge,       name='lounge-my'),
    path('lounge/<str:id>/reply',    misc_views.reply_lounge,    name='lounge-reply'),
    path('lounge/<str:id>/upvote',   misc_views.upvote_lounge,   name='lounge-upvote'),
    path('lounge/<str:id>',          misc_views.get_lounge_post, name='lounge-get'),

    # ── Blood ─────────────────────────────────────────────────────────────────
    path('blood/hospitals',                       blood_views.blood_hospitals,      name='blood-hospitals'),
    path('blood/donors/toggle',                   blood_views.toggle_donor,         name='blood-toggle'),
    path('blood/donors', _dispatch(
        GET=blood_views.blood_donors,
        POST=blood_views.register_donor,
    ), name='blood-donors'),
    path('blood/my-donor-profile',                blood_views.my_donor_profile,     name='blood-my-profile'),
    path('blood/request/<str:donor_id>',          blood_views.blood_request,        name='blood-request'),
    path('blood/requests',                        blood_views.blood_requests,       name='blood-requests'),
    path('blood/request/<str:id>/accept',         blood_views.accept_blood_request, name='blood-accept'),
    path('blood/request/<str:id>/decline',        blood_views.decline_blood_request,name='blood-decline'),
    path('blood/chat/<str:request_id>', _dispatch(
        GET=blood_views.blood_chat_get,
        POST=blood_views.blood_chat_send,
    ), name='blood-chat'),
]

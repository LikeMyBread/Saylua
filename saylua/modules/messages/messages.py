from flask import render_template, redirect, flash, request, g
import flask_sqlalchemy
from saylua import db
from saylua.utils.pagination import Pagination

from saylua.wrappers import login_required, communication_access_required
from saylua.utils import pluralize, get_from_request
from .models.db import Conversation, ConversationHandle, Message
from saylua.modules.users.models.db import User

from forms import ConversationForm, ConversationReplyForm, recipient_check

CONVERSATIONS_PER_PAGE = 25


# The main page where the user views all of their messages.
@login_required()
def messages_main():
    page_number = request.args.get('page', 1)
    page_number = int(page_number)

    conversations_query = (
        db.session.query(ConversationHandle)
        .filter(ConversationHandle.user_id == g.user.id)
        .filter(ConversationHandle.hidden == False)
        .order_by(ConversationHandle.last_updated.desc())
        .order_by(ConversationHandle.unread)
    )

    pagination = Pagination(per_page=CONVERSATIONS_PER_PAGE, query=conversations_query)
    return render_template('messages/all.html', pagination=pagination)


# The submit action for the user to update their messages.
@communication_access_required()
def messages_main_post():
    user_message_ids = request.form.getlist('user_conversation_id')
    keys = []
    for m_id in user_message_ids:
        if not m_id:
            flash('You are attempting to edit an invalid message!', 'error')
            return redirect('/messages/', code=302)
        keys.append(m_id)

    if ('hide' in request.form):
        result = ConversationHandle.hide_conversations(keys, g.user.id)
    elif ('read' in request.form):
        result = ConversationHandle.read_conversations(keys, g.user.id)

    if 'hide' in request.form and result:
        flash(pluralize(len(keys), 'message') + ' hidden. ')
    elif 'read' in request.form and result:
        flash(pluralize(len(keys), 'message') + ' marked as read. ')
    return redirect('/messages/', code=302)


# The page for a user to write new messages.
@communication_access_required()
def messages_write_new():
    form = ConversationForm(request.form)
    form.recipient.data = get_from_request(request, 'recipient', args_key='to')
    form.title.data = get_from_request(request, 'title')
    form.text.data = get_from_request(request, 'text')

    if form.validate_on_submit():
        to = recipient_check.user.id
        new_id = start_conversation(g.user.id, to, form.title.data, form.text.data)
        return redirect('/conversation/' + str(new_id) + '/', code=302)

    return render_template('messages/write.html', form=form)


# This route just marks a ConversationHandle as read and then redirects the user to the
# conversation they were looking to read. We make it a separate route so that the
# main "looking at a message" route doesn't have to bother with looking up
# the user's message metadata.
@login_required()
def messages_read(key):
    try:
        found_conversation = db.session.query(ConversationHandle).get((key, g.user.id))
        found_conversation.unread = False
        db.session.commit()
        return redirect('/conversation/' + str(key) + '/', code=302)
    except(flask_sqlalchemy.orm.exc.NoResultFound):
        return render_template('messages/invalid.html')


# The page to view a specific conversation.
@login_required()
def messages_view_conversation(key):
    found_conversation = db.session.query(ConversationHandle).get((key, g.user.id))
    if not found_conversation:
        return render_template('messages/invalid.html')

    form = ConversationReplyForm()
    form.text.data = get_from_request(request, 'text')
    if form.validate_on_submit():
        result = reply_conversation(key, g.user.id, form.text.data)
        if result:
            flash('You have replied to the message!')
            return redirect('/conversation/' + str(key) + '/', code=302)
        else:
            flash('Message reply failed for an unexpected reason.', 'error')

    members = (
        db.session.query(User)
        .join(ConversationHandle)
        .filter(ConversationHandle.conversation_id == key)
        .all()
    )
    messages = (
        db.session.query(Message)
        .filter(Message.conversation_id == key)
        .all()
    )
    return render_template('messages/view.html', conversation=found_conversation,
        members=members, conversation_messages=messages, form=form)


def start_conversation(sender_id, recipient_ids, title, text):
    new_conversation = Conversation()
    db.session.add(new_conversation)
    db.session.flush()
    first_message = Message(conversation_id=new_conversation.id, author_id=sender_id, text=text)
    db.session.add(first_message)
    send_member = ConversationHandle(conversation_id=new_conversation.id,
            user_id=sender_id, title=title, unread=False)
    db.session.add(send_member)
    if isinstance(recipient_ids, (int, long)): # noqa
        recipient_ids = [recipient_ids]
    recipient_ids = set(recipient_ids) # Remove duplicates
    if sender_id in recipient_ids:
        recipient_ids.remove(sender_id)
    for recip_id in recipient_ids:
        db.session.add(ConversationHandle(conversation_id=new_conversation.id,
                user_id=recip_id, title=title, unread=True))
    db.session.commit()
    return new_conversation.id


def reply_conversation(conversation_id, author_id, text):
    new_message = Message(conversation_id=conversation_id, author_id=author_id, text=text)
    db.session.add(new_message)
    conversation_users = (
        db.session.query(ConversationHandle)
        .filter(ConversationHandle.conversation_id == conversation_id)
        .all()
    )
    for conversation_user in conversation_users:
        conversation_user.last_updated = db.func.now()
        conversation_user.hidden = False
        if conversation_user.user_id != author_id:
            conversation_user.unread = True
        db.session.add(conversation_user)
    db.session.commit()
    return True

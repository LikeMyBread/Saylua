from saylua import db

from saylua.modules.users.models.db import User, InvalidCurrencyException
from saylua.utils import get_from_request
from saylua.wrappers import login_required
from saylua.modules.messages.models.db import Notification

from flask import render_template, redirect, g, flash, request
from ..forms import BankTransferForm, recipient_check


@login_required()
def bank_main():
    return render_template('bank/main.html')


@login_required()
def bank_transfer():
    form = BankTransferForm(request.form)
    form.recipient.data = get_from_request(request, 'recipient', args_key='to')

    if form.validate_on_submit():
        ss = form.star_shards.data or 0
        cc = form.cloud_coins.data or 0

        if not ss and not cc:
            flash('You must enter at least one currency to send.', 'error')
        elif ss < 0 or cc < 0:
            flash('You cannot send negative currency.', 'error')
        else:
            recipient = recipient_check.user
            try:
                User.transfer_currency(g.user.id, recipient.id, cc, ss)
                db.session.add(g.user)
                db.session.add(recipient)
                db.session.commit()
            except InvalidCurrencyException:
                flash('You do not have enough funds to send the amount entered.', 'error')
            except:
                flash('Currency transfer failed for an unexpected reason. Try again later.',
                    'error')
            else:
                flash('You have successfully sent %d SS and %d CC to %s'
                    % (ss, cc, recipient.name))

                # Send a notification to the user who received the currency
                Notification.send(recipient.id, '%s sent you %d SS and %d CC'
                    % (g.user.name, ss, cc), '/bank/')
                return redirect('/bank/transfer/')
    return render_template('bank/transfer.html', form=form)

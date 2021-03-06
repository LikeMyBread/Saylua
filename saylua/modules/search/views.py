from saylua import db
from flask import render_template, request

from saylua.modules.users.models.db import Username
from saylua.modules.items.models.db import Item
from saylua.modules.pets.models.db import Pet


def site_search():
    q = request.args.get('q')
    usernames = db.session.query(Username).filter(Username.name.contains(q)).limit(10)
    items = db.session.query(Item).filter(Item.name.contains(q)).limit(10)
    pets = db.session.query(Pet).filter(Pet.name.contains(q)).limit(10)
    return render_template('results.html', query=q,
        usernames=usernames, items=items, pets=pets)

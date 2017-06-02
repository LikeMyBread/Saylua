from saylua import db

from saylua.utils import get_from_request
from saylua.wrappers import admin_access_required

from .models.db import Item

from flask import render_template, redirect, url_for, flash, request
from forms import ItemUploadForm


@admin_access_required
def admin_panel_items_add():
    form = ItemUploadForm(request.form)
    form.name.data = get_from_request(request, 'name')
    form.description.data = get_from_request(request, 'description')
    if form.validate_on_submit():
        item = Item()
        form.populate_obj(item)
        db.session.add(item)
        db.session.commit()
        flash('You have successfully created a new item!')
        return redirect(url_for('items.admin_add'))
    return render_template('admin/add.html', form=form)


@admin_access_required
def admin_panel_items_edit():
    return render_template('admin/edit.html')

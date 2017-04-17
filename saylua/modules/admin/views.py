from saylua.models.role import Role
from saylua.wrappers import admin_access_required

from flask import render_template, redirect, flash, request


@admin_access_required
def admin_panel():
    return render_template('main.html')


@admin_access_required
def admin_panel_roles_add():
    if request.method == 'POST':
        name = request.form.get('name')
        new_role = Role(id=name)
        for priv in request.form:
            if priv != 'name':
                setattr(new_role, priv, request.form.get(priv) == 'True')
        new_role.put()
        flash('New Role successfully created!')
        return redirect("/admin/roles/add/")

    privs = Role().to_dict().keys()
    privs.sort()
    return render_template('roles/add.html', privs=privs)


@admin_access_required
def admin_panel_roles_edit():
    roles = Role.query().fetch()
    privs = Role().to_dict().keys()
    if request.method == 'POST':
        for role in roles:
            for priv in privs:
                setattr(role, priv, ((role.key.id() + "_*_" + priv) in request.form))
            role.put()
        flash("Roles successfully updated!")
    privs.sort()
    return render_template('roles/edit.html', roles=roles, privs=privs)

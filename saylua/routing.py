from flask import Blueprint, Flask
from flask.helpers import send_from_directory

from collections import namedtuple
from importlib import import_module

import os.path

class SayluaApp(Flask):
  """Extends the default Flask app to attempt to locate static files from Blueprints before 404'ing."""
  def send_static_file(self, filename):
    for blueprint_name, blueprint in self.blueprints.items():
      filepath = os.path.join(blueprint.static_folder, filename)

      if os.path.exists(filepath):
        return send_from_directory(blueprint.static_folder, filename)

    return super(SayluaApp, self).send_static_file(filename)

class SayluaRouter(Blueprint):
  """URL Routing syntas xugar."""

  @classmethod
  def create_blueprint(cls, module_name, import_name):
    return cls(
      module_name,
      import_name,
      static_folder='static',
      template_folder='templates',
      static_url_path='/static_{}'.format(module_name),
      url_prefix=None
    )

  def register_urls(self, urls):
    for _url in urls:
      self.add_url_rule(rule=_url.rule, endpoint=_url.name, view_func=_url.view_func, methods=_url.methods)

def url(rule, view_func, name=None, methods=["GET"]):
  """Simple URL wrapper for SayluaRouter.

  Usage:
  ```
  from . import views

  url('/explore/', view_func=views.explore_home, name='explore_home', methods=['GET'])
  url('/explore/', view_func=views.explore_home, name='explore_home')
  url('/explore/', views.explore_home, 'explore_home')
  url('/explore/', views.explore_home)
  ```

  # Note that 'endpoint' is now 'name'.
  # Note also that the name and view_func parameters are reversed from that of
  a normal flask URL.
  """

  __url = namedtuple('Url', ['rule', 'name', 'view_func', 'methods'])
  return __url(rule, name, view_func, methods)

def register_urls(app, modules):
  """Don't try to understand this."""

  for module_name in modules:
    formatted_module = "saylua.modules.{}".format(module_name)
    __module = import_module(formatted_module)
    app.register_blueprint(__module.blueprint)
# =======================================================
#
#  General -- Landing page and some other stuff.
#  ---------------------------------
#  Contains landing page related code.
#
# =======================================================

from saylua.routing import SayluaRouter
from . import urls

MODULE_NAME = 'general'
IMPORT_NAME = __name__

blueprint = SayluaRouter.create_blueprint(MODULE_NAME, IMPORT_NAME)
blueprint.register_urls(urls.urlpatterns)

from saylua.routing import url
from . import views


urlpatterns = [
    url('/museum/', view_func=views.museum_main, name="museum"),

    # Books
    url('/shelf/', view_func=views.book_shelf, name="books_shelf"),
    url('/read/<int:book_id>/', view_func=views.book_read, name="books_read")
]

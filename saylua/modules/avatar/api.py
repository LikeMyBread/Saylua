from saylua import app
from saylua.wrappers import api_login_required
from flask import send_file

from PIL import Image
from StringIO import StringIO
import os
import imghdr
import json


@api_login_required()
@app.route('/api/ha/wardrobe/')
def wardrobe():
    image_url_base = os.path.join(app.static_folder, 'img/ha')
    item_images = os.listdir(image_url_base)

    return json.dumps(item_images)


@api_login_required()
@app.route('/api/ha/<base>/')
def image_base(base):
    return image(base, '')


@app.route('/api/ha/<base>/<items>/')
def image(base, items):
    items = items.split(',')

    # This will be replaced with calls to the database later
    base = os.path.join(app.static_folder, 'img/avatar/m.png')
    image_url_base = os.path.join(app.static_folder, 'img/avatar')
    item_images = os.listdir(image_url_base)

    result = Image.open(base, 'r')
    for i in items:
        if i.isdigit():
            i = int(i)
        if i >= 0 and i < len(item_images):
            image_url = os.path.join(image_url_base, item_images[i])
            if imghdr.what(image_url) == 'png':
                # Stack the image on top of the current result
                curr_image = Image.open(image_url, 'r')

                # Third parameter is a mask used to preserve alpha
                result.paste(curr_image, (0, 0), curr_image)

    return serve_pil_image(result)


def serve_pil_image(pil_img):
    img_io = StringIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

from google.appengine.ext import ndb

import re

ItemTypes = {'food', 'clothing'}

# StructuredProperty for Conversation
class AvatarItemImage(ndb.Model):
    front_image = ndb.StringProperty()
    back_image = ndb.StringProperty()

class Item(ndb.Model):
    name = ndb.StringProperty()
    url_name = ndb.StringProperty()
    image_url = ndb.StringProperty()
    description = ndb.StringProperty()
    category = ndb.StringProperty()

    masculine_image = ndb.StructuredProperty(AvatarItemImage)
    feminine_image = ndb.StructuredProperty(AvatarItemImage)

    @classmethod
    def make_url_name(cls, name):
        name = re.sub(r'\s', '_', name)
        name = re.sub(r'\W', '-', name)
        return name.lower()

    @classmethod
    def by_url_name(cls, name):
        return cls.query(cls.url_name==name.lower()).get()

    @classmethod
    def update_item(cls, item, name, image_url, description, category):
        item.name = name
        item.image_url = image_url
        item.description = description
        item.category = category

        # Update the denormalized versions of this data in everyone's inventory

    @classmethod
    def give_item(cls, user_key, item, count):
        inventory_entry = InventoryItem.by_user_item(user_key, item.key)
        if not inventory_entry:
            inventory_entry = InventoryItem.construct(user_key, item)
        inventory_entry.count += count
        inventory_entry.put()


class InventoryItem(ndb.Model):
    name = ndb.StringProperty()
    image_url = ndb.StringProperty()
    description = ndb.StringProperty()
    category = ndb.StringProperty()

    user_key = ndb.KeyProperty()
    item_key = ndb.KeyProperty()

    # Note that when we update the name/image for an item we need to update it for all users
    count = ndb.IntegerProperty()

    @classmethod
    def construct(cls, user_key, item):
        return cls(name=item.name, image_url=item.image_url, description=item.description,
            category=item.category, user_key=user_key, item_key=item.key)

    @classmethod
    def by_user_item(cls, user_key, item_key):
        return cls.query(cls.user_key==user_key, cls.item_key==item_key).get()
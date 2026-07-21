import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("C:/Users/User/.gemini/antigravity/brain/2f664251-8709-474c-aac2-1df1503d5de2/serviceAccountKey.json")
try:
    firebase_admin.initialize_app(cred)
except ValueError:
    pass

db = firestore.client()

updates = {
    # Meals
    "Bigi Silk Road Wrap Meal": {"price": 12.99, "name": "Bigi Silk Road Wrap Meal"},
    "Chicken Shawarma Meal": {"price": 15.99, "name": "Chicken Shawarma Meal"},
    "Smash Burger Meal": {"price": 15.99, "name": "Smash Burger Meal"},
    "Beef Shawarma Meal": {"price": 17.95, "name": "Beef Shawarma Meal"},
    "Chicken Gyro Rice Bowl Meal": {"price": 16.95, "name": "Chicken Gyro Rice Bowl Meal"},
    "Beef Gyro Rice Bowl Meal": {"price": 18.95, "name": "Beef Gyro Rice Bowl Meal"},

    # Other items from TV
    "Qabuli Palaw": {"price": 19.99},
    "Tikka Kabab Plate": {"price": 19.99},
    "Chapli Kabab Plate": {"name": "Kobideh Kabob Skewer", "price": 19.99}, # Assuming Chapli is meant to be Kobideh based on TV menu? Or just rename? The user's DB has Chapli but TV has Kobideh. Let's create Kobideh if needed, or rename. Wait, Chapli is a different dish. The DB has Shami Kabab Plate ($20). Let's update Shami instead of Chapli? The TV menu has "Kobideh Kabob Skewer".
    "Veg Samosa": {"price": 1.99},
    "Chicken Samosa": {"price": 2.99},
    "Chicken Soup": {"price": 3.99},
    "Firni": {"price": 3.99},
    "Milk Tea (Chai)": {"name": "Chai Milk Tea", "price": 2.95},
    "Doogh": {"price": 3.95},
    "Cold Drinks": {"name": "Soft Drinks", "price": 2.45},
    "Bottled Water": {"price": 1.99},
    "Cheese Kabab Stick": {"price": 10.95}
}

menu_ref = db.collection('menu')
docs = menu_ref.stream()

for doc in docs:
    data = doc.to_dict()
    name = data.get('name')
    if name in updates:
        print(f"Updating exact match: {name}")
        menu_ref.document(doc.id).update(updates[name])
    elif name == "Afghan Burger Meal":
        print(f"Updating Afghan Burger Meal to Bigi Silk Road Wrap Meal")
        menu_ref.document(doc.id).update(updates["Bigi Silk Road Wrap Meal"])

print("Done updating prices and names!")
